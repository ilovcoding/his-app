import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createStore, shiftDate } from "../store.mjs";
const withStore = (fn) => () => {
    const s = createStore();
    try {
        fn(s);
    } finally {
        s.close();
    }
};
test(
    "演示数据包含八个模块且账单金额精确到分",
    withStore((s) => {
        const d = s.snapshot();
        assert.equal(d.patients.length, 16);
        assert.equal(d.beds.length, 12);
        for (const b of d.bills)
            assert.equal(
                b.total,
                d.billLines
                    .filter((l) => l.bill_id === b.id)
                    .reduce((n, l) => n + l.price * l.quantity, 0),
            );
    }),
);
test("创建顾客后关闭重开数据库仍然保留", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "his-test-"));
    const file = path.join(dir, "test.sqlite");
    let s = createStore(file);
    try {
        const { id } = s.mutate("patient.create", {
            name: "持久化演示",
            gender: "女",
            age: 28,
            phone: "13900009999",
        });
        s.close();
        s = createStore(file);
        assert.equal(
            s.snapshot().patients.find((p) => p.id === id).name,
            "持久化演示",
        );
        assert.throws(
            () =>
                s.mutate("patient.create", {
                    name: "重复手机号",
                    gender: "男",
                    age: 30,
                    phone: "13900009999",
                }),
            /已建档/,
        );
    } finally {
        s.close();
        rmSync(dir, { recursive: true, force: true });
    }
});
test(
    "预约冲突校验、取消释放时段及状态流转",
    withStore((s) => {
        const d = s.snapshot(),
            a = d.appointments.find((a) => a.date === d.today);
        const p = {
            patient_id: a.patient_id,
            doctor: a.doctor,
            date: a.date,
            time: a.time,
            project: "演示面诊",
            type: "初诊",
        };
        assert.throws(() => s.mutate("appointment.create", p), /已有预约/);
        p.time = "18:00";
        const { id } = s.mutate("appointment.create", p);
        assert.throws(
            () => s.mutate("appointment.status", { id, status: "已完成" }),
            /不能/,
        );
        s.mutate("appointment.status", { id, status: "已取消" });
        const newId = s.mutate("appointment.create", p).id;
        for (const status of ["已到院", "接诊中", "已完成"])
            s.mutate("appointment.status", { id: newId, status });
        assert.equal(
            s.snapshot().appointments.find((a) => a.id === newId).status,
            "已完成",
        );
    }),
);
test(
    "耗材登记原子扣库存并同步账单，已核对账单回到待核对",
    withStore((s) => {
        const before = s.snapshot();
        const op = before.surgeries.find((s) => s.status === "进行中");
        const bill = before.bills.find((b) => b.surgery_id === op.id),
            item = before.inventory[0];
        s.mutate("bill.confirm", { id: bill.id });
        s.mutate("consumption.create", {
            surgery_id: op.id,
            items: [{ item_id: item.id, quantity: 2 }],
        });
        const after = s.snapshot();
        assert.equal(
            after.inventory.find((i) => i.id === item.id).stock,
            item.stock - 2,
        );
        assert.equal(
            after.bills.find((b) => b.id === bill.id).total,
            bill.total + item.price * 2,
        );
        assert.equal(
            after.bills.find((b) => b.id === bill.id).status,
            "待核对",
        );
        assert.equal(after.movements[0].type, "手术领用");
    }),
);
test(
    "多项耗材中任一不足，库存、账单和流水全部回滚",
    withStore((s) => {
        const before = s.snapshot(),
            op = before.surgeries.find((s) => s.status === "进行中");
        assert.throws(
            () =>
                s.mutate("consumption.create", {
                    surgery_id: op.id,
                    items: [
                        { item_id: 1, quantity: 1 },
                        { item_id: 2, quantity: 9999 },
                    ],
                }),
            /库存不足/,
        );
        assert.deepEqual(s.snapshot(), before);
    }),
);
test(
    "过期耗材不可领用，未开始手术不可登记",
    withStore((s) => {
        const d = s.snapshot(),
            op = d.surgeries.find((s) => s.status === "进行中"),
            planned = d.surgeries.find((s) => s.status === "待手术");
        assert.throws(
            () =>
                s.mutate("consumption.create", {
                    surgery_id: planned.id,
                    items: [{ item_id: 1, quantity: 1 }],
                }),
            /先开始手术/,
        );
        s.db
            .prepare("UPDATE inventory SET expiry=? WHERE id=1")
            .run(shiftDate(d.today, -1));
        assert.throws(
            () =>
                s.mutate("consumption.create", {
                    surgery_id: op.id,
                    items: [{ item_id: 1, quantity: 1 }],
                }),
            /已过期/,
        );
    }),
);
test(
    "采购仅验收时入库且不能重复验收，盘点生成差异流水",
    withStore((s) => {
        const d = s.snapshot(),
            item = d.inventory[0];
        const { id } = s.mutate("purchase.create", {
            item_id: item.id,
            supplier: "演示供应商",
            quantity: 10,
            cost: 12.34,
        });
        assert.equal(s.snapshot().inventory[0].stock, item.stock);
        s.mutate("purchase.receive", { id });
        assert.equal(s.snapshot().inventory[0].stock, item.stock + 10);
        assert.throws(() => s.mutate("purchase.receive", { id }), /重复/);
        s.mutate("inventory.count", {
            item_id: item.id,
            stock: 20,
            reason: "演示盘点差异",
        });
        assert.equal(s.snapshot().inventory[0].stock, 20);
        assert.equal(s.snapshot().movements[0].type, "盘亏出库");
    }),
);
test(
    "床位入住排重、出院计费、待清洁不可入住",
    withStore((s) => {
        const d = s.snapshot(),
            bed = d.beds.find((b) => b.status === "空闲"),
            other = d.beds.filter((b) => b.status === "空闲")[1],
            patient = d.patients.find(
                (p) => !d.beds.some((b) => b.patient_id === p.id),
            );
        s.mutate("bed.assign", { id: bed.id, patient_id: patient.id });
        assert.throws(
            () =>
                s.mutate("bed.assign", {
                    id: other.id,
                    patient_id: patient.id,
                }),
            /已经入住/,
        );
        s.mutate("bed.discharge", { id: bed.id });
        assert.equal(
            s.snapshot().beds.find((b) => b.id === bed.id).status,
            "待清洁",
        );
        assert.ok(
            s
                .snapshot()
                .billLines.some(
                    (l) => l.category === "床位护理" && l.price === bed.rate,
                ),
        );
        assert.throws(
            () =>
                s.mutate("bed.assign", { id: bed.id, patient_id: patient.id }),
            /不可入住/,
        );
        s.mutate("bed.clean", { id: bed.id });
        assert.equal(
            s.snapshot().beds.find((b) => b.id === bed.id).status,
            "空闲",
        );
    }),
);
test(
    "结算必须先核对，未完成手术不能结清，结清不可重复收款或追加耗材",
    withStore((s) => {
        const d = s.snapshot(),
            op = d.surgeries.find((s) => s.status === "进行中"),
            bill = d.bills.find((b) => b.surgery_id === op.id);
        assert.throws(
            () => s.mutate("bill.pay", { id: bill.id, method: "现金" }),
            /先核对/,
        );
        s.mutate("bill.confirm", { id: bill.id });
        assert.throws(
            () => s.mutate("bill.pay", { id: bill.id, method: "现金" }),
            /手术完成/,
        );
        s.mutate("surgery.status", { id: op.id, status: "已完成" });
        s.mutate("bill.pay", { id: bill.id, method: "银行卡" });
        assert.equal(
            s.snapshot().bills.find((b) => b.id === bill.id).status,
            "已结清",
        );
        assert.throws(
            () => s.mutate("bill.pay", { id: bill.id, method: "现金" }),
            /重复收款/,
        );
        assert.throws(
            () =>
                s.mutate("consumption.create", {
                    surgery_id: op.id,
                    items: [{ item_id: 1, quantity: 1 }],
                }),
            /已结清/,
        );
    }),
);
test(
    "病历草稿可改，归档要求诊断与计划且不可修改",
    withStore((s) => {
        const p = {
            patient_id: 1,
            date: s.snapshot().today,
            doctor: "沈知行",
            complaint: "演示主诉",
            status: "草稿",
        };
        const { id } = s.mutate("record.save", p);
        assert.throws(
            () => s.mutate("record.save", { ...p, id, status: "已归档" }),
            /诊断/,
        );
        s.mutate("record.save", {
            ...p,
            id,
            diagnosis: "演示评估",
            plan: "演示安排",
            status: "已归档",
        });
        assert.throws(() => s.mutate("record.save", { ...p, id }), /已归档/);
    }),
);
test(
    "手术安排校验跨时段冲突，并创建项目费用",
    withStore((s) => {
        const date = shiftDate(s.snapshot().today, 3);
        const p = {
            patient_id: 1,
            doctor: "沈知行",
            date,
            time: "09:00",
            duration: 90,
            room: "手术室 A",
            nurse: "吴晓敏",
            project: "演示治疗",
            fee: 123.45,
        };
        const { id } = s.mutate("surgery.create", p);
        assert.equal(
            s.snapshot().bills.find((b) => b.surgery_id === id).total,
            12345,
        );
        assert.throws(
            () =>
                s.mutate("surgery.create", {
                    ...p,
                    patient_id: 2,
                    time: "10:00",
                }),
            /时间冲突/,
        );
        assert.throws(
            () => s.mutate("surgery.create", { ...p, time: "23:30" }),
            /跨日/,
        );
    }),
);
test(
    "新建物资保存批次与期初库存，并拒绝重复批次",
    withStore((s) => {
        const p = {
            name: "测试无菌纱布",
            spec: "8cm",
            category: "护理耗材",
            unit: "包",
            stock: 30,
            minimum: 10,
            cost: 5.5,
            price: 10,
            batch: "TEST001",
            expiry: shiftDate(s.snapshot().today, 30),
            supplier: "演示供应商",
            warehouse: "中心库",
        };
        const { id } = s.mutate("inventory.create", p);
        assert.equal(s.snapshot().inventory.find((i) => i.id === id).cost, 550);
        assert.equal(s.snapshot().movements[0].balance, 30);
        assert.throws(() => s.mutate("inventory.create", p), /已存在/);
    }),
);
test(
    "重置仅接受明确确认，成功后恢复完整演示关系",
    withStore((s) => {
        assert.throws(() => s.mutate("demo.reset", {}), /确认/);
        s.mutate("patient.create", {
            name: "临时演示",
            gender: "女",
            age: 22,
            phone: "13900008888",
        });
        s.mutate("demo.reset", { confirm: "RESET_DEMO" });
        assert.equal(s.snapshot().patients.length, 16);
        assert.equal(s.snapshot().surgeries.length, 4);
    }),
);
