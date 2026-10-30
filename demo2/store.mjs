import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export function today() {
    const p = Object.fromEntries(
        new Intl.DateTimeFormat("en-US", {
            timeZone: "Asia/Shanghai",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        })
            .formatToParts()
            .map((x) => [x.type, x.value]),
    );
    return `${p.year}-${p.month}-${p.day}`;
}
export function shiftDate(date, days) {
    return new Date(Date.parse(`${date}T12:00:00+08:00`) + days * 86400000)
        .toISOString()
        .slice(0, 10);
}
const doctors = [
    {
        name: "沈知行",
        title: "主任医师",
        department: "整形外科",
        color: "#1677ff",
        initial: "沈",
        room: "诊室 01",
    },
    {
        name: "林予安",
        title: "主治医师",
        department: "皮肤美容科",
        color: "#6d70bb",
        initial: "林",
        room: "诊室 02",
    },
    {
        name: "许清和",
        title: "副主任医师",
        department: "整形外科",
        color: "#b98342",
        initial: "许",
        room: "诊室 03",
    },
    {
        name: "周以宁",
        title: "主治医师",
        department: "口腔科",
        color: "#477eab",
        initial: "周",
        room: "诊室 04",
    },
];
const fail = (message, status = 400) => {
    const e = new Error(message);
    e.status = status;
    throw e;
};
const str = (v, label, max = 200, optional = false) => {
    const s = typeof v === "string" ? v.trim() : "";
    if ((!s && !optional) || s.length > max)
        fail(`${label}不能为空且不能超过 ${max} 个字符`);
    return s;
};
const num = (v, label, min = 0, max = 100000000, integer = false) => {
    if (
        v === "" ||
        v == null ||
        !Number.isFinite(Number(v)) ||
        Number(v) < min ||
        Number(v) > max ||
        (integer && !Number.isInteger(Number(v)))
    )
        fail(`${label}数值无效`);
    return Number(v);
};
const choice = (v, values, label) => {
    if (!values.includes(v)) fail(`${label}无效`);
    return v;
};
const dateValue = (v) => {
    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(v ?? "") ||
        !Number.isFinite(Date.parse(v)) ||
        new Date(`${v}T12:00:00Z`).toISOString().slice(0, 10) !== v
    )
        fail("日期格式无效");
    return v;
};
const timeValue = (v) => {
    if (!/^([01]\d|2[0-3]):(00|30)$/.test(v ?? ""))
        fail("请选择整点或半点时间");
    return v;
};
const cents = (v, label) => Math.round(num(v, label, 0, 1000000) * 100);
const mins = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));

export function createStore(path = ":memory:") {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    const db = new DatabaseSync(path);
    db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS patients (id INTEGER PRIMARY KEY, name TEXT NOT NULL, gender TEXT NOT NULL, age INTEGER NOT NULL, phone TEXT NOT NULL, category TEXT NOT NULL, allergies TEXT NOT NULL, note TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS appointments (id INTEGER PRIMARY KEY, patient_id INTEGER NOT NULL REFERENCES patients(id), doctor TEXT NOT NULL, department TEXT NOT NULL, date TEXT NOT NULL, time TEXT NOT NULL, project TEXT NOT NULL, type TEXT NOT NULL, status TEXT NOT NULL, note TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS records (id INTEGER PRIMARY KEY, patient_id INTEGER NOT NULL REFERENCES patients(id), date TEXT NOT NULL, doctor TEXT NOT NULL, complaint TEXT NOT NULL, history TEXT NOT NULL, examination TEXT NOT NULL, diagnosis TEXT NOT NULL, plan TEXT NOT NULL, status TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS surgeries (id INTEGER PRIMARY KEY, patient_id INTEGER NOT NULL REFERENCES patients(id), doctor TEXT NOT NULL, project TEXT NOT NULL, date TEXT NOT NULL, time TEXT NOT NULL, duration INTEGER NOT NULL, room TEXT NOT NULL, nurse TEXT NOT NULL, status TEXT NOT NULL, fee INTEGER NOT NULL, note TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS inventory (id INTEGER PRIMARY KEY, name TEXT NOT NULL, spec TEXT NOT NULL, category TEXT NOT NULL, unit TEXT NOT NULL, stock INTEGER NOT NULL CHECK(stock>=0), minimum INTEGER NOT NULL, cost INTEGER NOT NULL, price INTEGER NOT NULL, batch TEXT NOT NULL, expiry TEXT NOT NULL, supplier TEXT NOT NULL, warehouse TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS consumptions (id INTEGER PRIMARY KEY, surgery_id INTEGER NOT NULL REFERENCES surgeries(id), item_id INTEGER NOT NULL REFERENCES inventory(id), quantity INTEGER NOT NULL CHECK(quantity>0), price INTEGER NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS movements (id INTEGER PRIMARY KEY, item_id INTEGER NOT NULL REFERENCES inventory(id), type TEXT NOT NULL, quantity INTEGER NOT NULL, balance INTEGER NOT NULL, reference TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS beds (id INTEGER PRIMARY KEY, ward TEXT NOT NULL, code TEXT NOT NULL UNIQUE, type TEXT NOT NULL, rate INTEGER NOT NULL, status TEXT NOT NULL, patient_id INTEGER UNIQUE REFERENCES patients(id), admitted_at TEXT, nurse TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS bills (id INTEGER PRIMARY KEY, patient_id INTEGER NOT NULL REFERENCES patients(id), surgery_id INTEGER UNIQUE REFERENCES surgeries(id), date TEXT NOT NULL, status TEXT NOT NULL, method TEXT, paid_at TEXT);
    CREATE TABLE IF NOT EXISTS bill_lines (id INTEGER PRIMARY KEY, bill_id INTEGER NOT NULL REFERENCES bills(id), name TEXT NOT NULL, category TEXT NOT NULL, quantity INTEGER NOT NULL, price INTEGER NOT NULL, source TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS purchases (id INTEGER PRIMARY KEY, item_id INTEGER NOT NULL REFERENCES inventory(id), supplier TEXT NOT NULL, quantity INTEGER NOT NULL, cost INTEGER NOT NULL, date TEXT NOT NULL, status TEXT NOT NULL, note TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS activities (id INTEGER PRIMARY KEY, title TEXT NOT NULL, detail TEXT NOT NULL, type TEXT NOT NULL, created_at TEXT NOT NULL);
  `);
    const all = (sql, ...args) => db.prepare(sql).all(...args);
    const one = (sql, ...args) => db.prepare(sql).get(...args);
    const run = (sql, ...args) => db.prepare(sql).run(...args);
    const insert = (table, values) =>
        Number(
            run(
                `INSERT INTO ${table} (${Object.keys(values).join(",")}) VALUES (${Object.keys(
                    values,
                )
                    .map(() => "?")
                    .join(",")})`,
                ...Object.values(values),
            ).lastInsertRowid,
        );
    const update = (table, id, values) =>
        run(
            `UPDATE ${table} SET ${Object.keys(values)
                .map((k) => `${k}=?`)
                .join(",")} WHERE id=?`,
            ...Object.values(values),
            id,
        );
    const requireRow = (table, id) => {
        const row = one(
            `SELECT * FROM ${table} WHERE id=?`,
            num(id, "编号", 1, 1e9, true),
        );
        if (!row) fail("记录不存在", 404);
        return row;
    };
    const transaction = (fn) => {
        db.exec("BEGIN IMMEDIATE");
        try {
            const r = fn();
            db.exec("COMMIT");
            return r;
        } catch (e) {
            db.exec("ROLLBACK");
            throw e;
        }
    };
    const activity = (title, detail, type = "general") =>
        insert("activities", {
            title,
            detail,
            type,
            created_at: new Date().toISOString(),
        });
    const movement = (item, quantity, type, reference) => {
        update("inventory", item.id, { stock: item.stock + quantity });
        insert("movements", {
            item_id: item.id,
            type,
            quantity,
            balance: item.stock + quantity,
            reference,
            created_at: new Date().toISOString(),
        });
    };
    const billFor = (patient, surgery = null) => {
        const existing = surgery
            ? one("SELECT * FROM bills WHERE surgery_id=?", surgery)
            : one(
                  "SELECT * FROM bills WHERE patient_id=? AND status!='已结清' ORDER BY id DESC LIMIT 1",
                  patient,
              );
        if (existing) {
            if (existing.status === "已结清")
                fail("该手术账单已结清，不能继续登记费用");
            return existing.id;
        }
        return insert("bills", {
            patient_id: patient,
            surgery_id: surgery,
            date: today(),
            status: "待核对",
            method: null,
            paid_at: null,
        });
    };
    const line = (bill, name, category, quantity, price, source) => {
        update("bills", bill, { status: "待核对" });
        insert("bill_lines", {
            bill_id: bill,
            name,
            category,
            quantity,
            price,
            source,
        });
    };

    function seed() {
        const t = today();
        const names = [
            "顾予晴",
            "陈语桐",
            "宋嘉宁",
            "陆晚晴",
            "苏念安",
            "温以棠",
            "江若溪",
            "程子墨",
            "季舒窈",
            "许星澜",
            "沈知夏",
            "林书瑶",
            "唐可欣",
            "周沐辰",
            "叶清禾",
            "孟云舒",
        ];
        const patients = names.map((name, i) =>
            insert("patients", {
                name,
                gender: [7, 13].includes(i) ? "男" : "女",
                age: [
                    28, 32, 26, 35, 29, 41, 30, 27, 36, 25, 33, 38, 24, 31, 29,
                    34,
                ][i],
                phone: `1380000${String(1000 + i).slice(-4)}`,
                category: i % 4 === 0 ? "VIP" : "普通顾客",
                allergies:
                    i === 2
                        ? "青霉素过敏"
                        : i === 5
                          ? "乳胶过敏"
                          : "无已知过敏",
                note:
                    i % 3 === 0
                        ? "偏好上午就诊，请提前确认时间。"
                        : "已完成院内初次建档。",
                created_at: shiftDate(t, -60 + i * 3),
            }),
        );
        const projects = [
            "眼部综合面诊",
            "皮肤状态评估",
            "术后复查",
            "鼻部整形面诊",
            "面部年轻化咨询",
            "口腔综合检查",
            "术前评估",
            "皮肤治疗复诊",
        ];
        const slots = [
            "09:00",
            "09:30",
            "10:00",
            "10:30",
            "11:00",
            "11:30",
            "13:30",
            "14:00",
            "14:30",
            "15:00",
            "15:30",
            "16:00",
        ];
        for (let i = 0; i < 12; i++) {
            const d = doctors[[0, 1, 2, 2, 0, 3, 2, 1][i % 8]];
            insert("appointments", {
                patient_id: patients[i],
                doctor: d.name,
                department: d.department,
                date: t,
                time: slots[i],
                project: projects[i % 8],
                type: i % 3 === 0 ? "复诊" : "初诊",
                status:
                    i < 3
                        ? "已完成"
                        : i === 3
                          ? "接诊中"
                          : i < 6
                            ? "已到院"
                            : "待到院",
                note: i === 2 ? "请携带上次检查资料" : "已电话确认就诊时间",
            });
        }
        for (let k = -6; k <= 2; k++)
            if (k !== 0)
                for (let i = 0; i < 7 + ((k + 6) % 4); i++) {
                    const d = doctors[[0, 1, 2, 2, 0, 3, 2, 1][i % 8]];
                    insert("appointments", {
                        patient_id: patients[(i + k + 16) % 16],
                        doctor: d.name,
                        department: d.department,
                        date: shiftDate(t, k),
                        time: slots[i],
                        project: projects[i % 8],
                        type: i % 3 === 0 ? "复诊" : "初诊",
                        status: k < 0 ? "已完成" : "待到院",
                        note: "",
                    });
                }
        patients.slice(0, 9).forEach((id, i) =>
            insert("records", {
                patient_id: id,
                date: shiftDate(t, i < 3 ? 0 : -i),
                doctor: doctors[[0, 1, 2, 2, 0, 3, 2, 1][i % 8]].name,
                complaint: projects[i % 8] + "，希望了解相关诊疗方案。",
                history: "既往情况已询问，相关信息待医师复核。",
                examination: "已完成基础检查，具体检查结果详见就诊资料。",
                diagnosis: i % 2 ? "皮肤问题评估（演示）" : "术前评估（演示）",
                plan: "完成相关检查后，由主诊医师确认后续诊疗安排。",
                status: i < 2 ? "已归档" : "草稿",
                updated_at: new Date().toISOString(),
            }),
        );
        const goods = [
            [
                "一次性无菌手术包",
                "标准型 / 独立包装",
                "手术耗材",
                "包",
                48,
                20,
                6800,
                9800,
                "稳健医疗",
                "中心库",
            ],
            [
                "可吸收外科缝线",
                "6-0 / 45cm",
                "手术耗材",
                "根",
                18,
                30,
                8500,
                12000,
                "强生医疗",
                "手术室库",
            ],
            [
                "医用无菌手套",
                "7号 / 双层防护",
                "防护用品",
                "双",
                260,
                100,
                650,
                1200,
                "稳健医疗",
                "中心库",
            ],
            [
                "一次性注射器",
                "5ml / 螺口",
                "医疗器械",
                "支",
                320,
                100,
                180,
                500,
                "威高医疗",
                "中心库",
            ],
            [
                "医用透明质酸钠凝胶",
                "1ml / 独立包装",
                "高值耗材",
                "支",
                12,
                15,
                128000,
                198000,
                "华熙生物",
                "手术室库",
            ],
            [
                "医用敷料",
                "10cm × 10cm",
                "护理耗材",
                "片",
                156,
                50,
                1800,
                3500,
                "敷尔佳",
                "中心库",
            ],
            [
                "一次性手术刀片",
                "15号 / 碳钢",
                "手术耗材",
                "片",
                86,
                30,
                400,
                1000,
                "上海金环",
                "手术室库",
            ],
            [
                "碘伏消毒液",
                "100ml / 瓶",
                "消毒用品",
                "瓶",
                8,
                15,
                1200,
                2000,
                "利尔康",
                "中心库",
            ],
            [
                "无菌纱布块",
                "8cm × 8cm / 8层",
                "护理耗材",
                "包",
                210,
                60,
                500,
                1000,
                "稳健医疗",
                "中心库",
            ],
            [
                "医用胶带",
                "2.5cm × 9m",
                "护理耗材",
                "卷",
                64,
                20,
                800,
                1500,
                "3M医疗",
                "中心库",
            ],
            [
                "一次性输液器",
                "精密过滤型",
                "医疗器械",
                "套",
                96,
                30,
                800,
                1800,
                "威高医疗",
                "手术室库",
            ],
            [
                "医用冷敷贴",
                "25g / 片",
                "护理耗材",
                "片",
                120,
                40,
                1200,
                2500,
                "敷尔佳",
                "中心库",
            ],
        ];
        goods.forEach((g, i) => {
            const id = insert("inventory", {
                name: g[0],
                spec: g[1],
                category: g[2],
                unit: g[3],
                stock: g[4],
                minimum: g[5],
                cost: g[6],
                price: g[7],
                batch: `LOT${t.replaceAll("-", "").slice(2)}${String(i + 1).padStart(3, "0")}`,
                expiry: shiftDate(t, i === 7 ? 25 : 240 + i * 20),
                supplier: g[8],
                warehouse: g[9],
            });
            insert("movements", {
                item_id: id,
                type: "期初入库",
                quantity: g[4],
                balance: g[4],
                reference: "演示期初库存",
                created_at: new Date().toISOString(),
            });
        });
        for (let i = 0; i < 4; i++) {
            const id = insert("surgeries", {
                patient_id: patients[i + 3],
                doctor: doctors[[0, 1, 2, 1][i]].name,
                project: [
                    "眼部综合手术",
                    "面部年轻化治疗",
                    "鼻部综合手术",
                    "皮肤光电治疗",
                ][i],
                date: t,
                time: ["09:00", "10:30", "14:00", "15:30"][i],
                duration: [90, 60, 120, 60][i],
                room: i % 2 ? "手术室 B" : "手术室 A",
                nurse: ["吴晓敏", "赵可心"][i % 2],
                status: ["已完成", "进行中", "待手术", "待手术"][i],
                fee: [680000, 320000, 1280000, 180000][i],
                note: "术前检查资料已核验",
            });
            const bill = billFor(patients[i + 3], id);
            line(
                bill,
                [
                    "眼部综合手术",
                    "面部年轻化治疗",
                    "鼻部综合手术",
                    "皮肤光电治疗",
                ][i],
                "诊疗项目",
                1,
                [680000, 320000, 1280000, 180000][i],
                `手术 S${id}`,
            );
            if (i < 2) {
                for (const [itemId, q] of [
                    [1, 1],
                    [3, 2],
                    [6, 2],
                ]) {
                    const item = requireRow("inventory", itemId);
                    insert("consumptions", {
                        surgery_id: id,
                        item_id: itemId,
                        quantity: q,
                        price: item.price,
                        created_at: new Date().toISOString(),
                    });
                    movement(item, -q, "手术领用", `手术 S${id}`);
                    line(
                        bill,
                        item.name,
                        "手术耗材",
                        q,
                        item.price,
                        `手术 S${id}`,
                    );
                }
            }
            if (i === 0) update("bills", bill, { status: "待收款" });
        }
        for (let i = 0; i < 12; i++)
            insert("beds", {
                ward: i < 6 ? "A 区 · 舒适病房" : "B 区 · 私享病房",
                code: `${i < 6 ? "A" : "B"}${String((i % 6) + 1).padStart(2, "0")}`,
                type: i < 6 ? "标准双人间" : "独立单人间",
                rate: i < 6 ? 38000 : 68000,
                status: i < 5 ? "使用中" : i === 10 ? "待清洁" : "空闲",
                patient_id: i < 5 ? patients[i + 2] : null,
                admitted_at: i < 5 ? shiftDate(t, -(i % 3)) : null,
                nurse: i % 2 ? "赵可心" : "吴晓敏",
            });
        for (let i = 0; i < 8; i++) {
            const day = shiftDate(t, -(i % 5));
            const bill = insert("bills", {
                patient_id: patients[i + 8],
                surgery_id: null,
                date: day,
                status: i < 5 ? "已结清" : i === 5 ? "待收款" : "待核对",
                method: i < 5 ? ["微信支付", "银行卡", "支付宝"][i % 3] : null,
                paid_at: i < 5 ? day + "T04:00:00Z" : null,
            });
            line(
                bill,
                ["皮肤治疗", "口腔检查", "术后复查"][i % 3],
                "诊疗项目",
                1,
                [180000, 36000, 20000][i % 3],
                "门诊登记",
            );
            update("bills", bill, {
                status: i < 5 ? "已结清" : i === 5 ? "待收款" : "待核对",
            });
        }
        insert("purchases", {
            item_id: 2,
            supplier: "强生医疗",
            quantity: 50,
            cost: 8500,
            date: t,
            status: "待入库",
            note: "补充手术室安全库存",
        });
        insert("purchases", {
            item_id: 8,
            supplier: "利尔康",
            quantity: 30,
            cost: 1200,
            date: t,
            status: "待入库",
            note: "常规补货",
        });
        activity(
            "演示数据已就绪",
            "预约、诊疗、耗材与费用数据已关联，可以体验完整业务流程。",
            "system",
        );
        activity(
            "手术耗材完成登记",
            "陆晚晴 · 眼部综合手术 · 3 类耗材已计入账单",
            "surgery",
        );
        activity(
            "待核对费用已生成",
            "请财务核对项目与耗材明细后收款。",
            "finance",
        );
        insert("meta", { key: "seed_date", value: t });
    }
    if (!one("SELECT value FROM meta WHERE key='seed_date'")) transaction(seed);

    function snapshot() {
        return {
            today: today(),
            seedDate: one("SELECT value FROM meta WHERE key='seed_date'").value,
            doctors,
            patients: all("SELECT * FROM patients ORDER BY id DESC"),
            appointments: all(
                "SELECT a.*,p.name patient_name,p.gender,p.age,p.phone,p.category FROM appointments a JOIN patients p ON p.id=a.patient_id ORDER BY a.date,a.time",
            ),
            records: all(
                "SELECT r.*,p.name patient_name FROM records r JOIN patients p ON p.id=r.patient_id ORDER BY r.date DESC,r.id DESC",
            ),
            surgeries: all(
                "SELECT s.*,p.name patient_name,p.gender,p.age,p.allergies FROM surgeries s JOIN patients p ON p.id=s.patient_id ORDER BY s.date DESC,s.time",
            ),
            inventory: all("SELECT * FROM inventory ORDER BY id"),
            consumptions: all(
                "SELECT c.*,i.name,i.unit,i.batch FROM consumptions c JOIN inventory i ON i.id=c.item_id ORDER BY c.id DESC",
            ),
            movements: all(
                "SELECT m.*,i.name,i.unit FROM movements m JOIN inventory i ON i.id=m.item_id ORDER BY m.id DESC LIMIT 200",
            ),
            beds: all(
                "SELECT b.*,p.name patient_name FROM beds b LEFT JOIN patients p ON p.id=b.patient_id ORDER BY b.code",
            ),
            bills: all(
                "SELECT b.*,p.name patient_name,p.phone,COALESCE(SUM(l.quantity*l.price),0) total FROM bills b JOIN patients p ON p.id=b.patient_id LEFT JOIN bill_lines l ON l.bill_id=b.id GROUP BY b.id ORDER BY b.id DESC",
            ),
            billLines: all("SELECT * FROM bill_lines ORDER BY id"),
            purchases: all(
                "SELECT p.*,i.name item_name,i.unit FROM purchases p JOIN inventory i ON i.id=p.item_id ORDER BY p.id DESC",
            ),
            activities: all(
                "SELECT * FROM activities ORDER BY id DESC LIMIT 30",
            ),
        };
    }

    function mutate(action, p = {}) {
        return transaction(() => {
            let id;
            switch (action) {
                case "patient.create": {
                    const phone = str(p.phone, "手机号", 11);
                    if (!/^1\d{10}$/.test(phone)) fail("请填写 11 位手机号");
                    if (one("SELECT id FROM patients WHERE phone=?", phone))
                        fail("该手机号已建档，请选择已有顾客");
                    id = insert("patients", {
                        name: str(p.name, "姓名", 30),
                        gender: choice(p.gender, ["男", "女"], "性别"),
                        age: num(p.age, "年龄", 0, 120, true),
                        phone,
                        category: choice(
                            p.category ?? "普通顾客",
                            ["普通顾客", "VIP"],
                            "顾客类型",
                        ),
                        allergies: str(p.allergies || "无已知过敏", "过敏史"),
                        note: str(p.note || "", "备注", 1000, true),
                        created_at: today(),
                    });
                    activity(
                        "新顾客建档",
                        `${p.name} · 已建立就诊档案`,
                        "patient",
                    );
                    break;
                }
                case "appointment.create": {
                    const patient = requireRow("patients", p.patient_id);
                    const doctor = doctors.find((d) => d.name === p.doctor);
                    if (!doctor) fail("请选择医生");
                    const date = dateValue(p.date),
                        time = timeValue(p.time);
                    if (
                        one(
                            "SELECT id FROM appointments WHERE date=? AND time=? AND status!='已取消' AND (doctor=? OR patient_id=?)",
                            date,
                            time,
                            doctor.name,
                            patient.id,
                        )
                    )
                        fail("该时间段医生或顾客已有预约，请选择其他时段");
                    id = insert("appointments", {
                        patient_id: patient.id,
                        doctor: doctor.name,
                        department: doctor.department,
                        date,
                        time,
                        project: str(p.project, "预约项目", 80),
                        type: choice(p.type, ["初诊", "复诊"], "预约类型"),
                        status: "待到院",
                        note: str(p.note || "", "备注", 1000, true),
                    });
                    activity(
                        "新增面诊预约",
                        `${patient.name} · ${date} ${time} · ${doctor.name}`,
                        "appointment",
                    );
                    break;
                }
                case "appointment.status": {
                    const a = requireRow("appointments", p.id);
                    const valid = {
                        待到院: ["已到院", "已取消"],
                        已到院: ["接诊中", "已取消"],
                        接诊中: ["已完成"],
                    };
                    if (!valid[a.status]?.includes(p.status))
                        fail("当前预约状态不能执行此操作");
                    update("appointments", a.id, { status: p.status });
                    id = a.id;
                    activity(
                        "预约进度更新",
                        `${requireRow("patients", a.patient_id).name} · ${p.status}`,
                        "appointment",
                    );
                    break;
                }
                case "record.save": {
                    const patient = requireRow("patients", p.patient_id);
                    const doctor = choice(
                        p.doctor,
                        doctors.map((d) => d.name),
                        "医生",
                    );
                    if (p.id) {
                        const r = requireRow("records", p.id);
                        if (r.patient_id !== patient.id)
                            fail("病历与顾客不匹配");
                        if (r.status === "已归档") fail("已归档病历不可修改");
                    }
                    const status = choice(
                        p.status,
                        ["草稿", "已归档"],
                        "病历状态",
                    );
                    const values = {
                        patient_id: patient.id,
                        date: dateValue(p.date),
                        doctor,
                        complaint: str(p.complaint, "主诉", 3000),
                        history: str(p.history || "", "现病史", 5000, true),
                        examination: str(
                            p.examination || "",
                            "检查",
                            5000,
                            true,
                        ),
                        diagnosis: str(
                            p.diagnosis || "",
                            "诊断",
                            3000,
                            status === "草稿",
                        ),
                        plan: str(
                            p.plan || "",
                            "诊疗计划",
                            5000,
                            status === "草稿",
                        ),
                        status,
                        updated_at: new Date().toISOString(),
                    };
                    if (p.id) {
                        update("records", p.id, values);
                        id = Number(p.id);
                    } else id = insert("records", values);
                    activity(
                        status === "已归档" ? "病历已归档" : "病历草稿已保存",
                        `${patient.name} · ${doctor}`,
                        "record",
                    );
                    break;
                }
                case "surgery.create": {
                    const patient = requireRow("patients", p.patient_id);
                    const doctor = choice(
                        p.doctor,
                        doctors.map((d) => d.name),
                        "医生",
                    );
                    const date = dateValue(p.date),
                        time = timeValue(p.time),
                        duration = num(p.duration, "时长", 30, 480, true),
                        room = choice(
                            p.room,
                            ["手术室 A", "手术室 B", "治疗室 C"],
                            "手术室",
                        );
                    if (mins(time) + duration > 24 * 60)
                        fail("手术结束时间不能跨日");
                    if (
                        all("SELECT * FROM surgeries WHERE date=?", date).some(
                            (s) =>
                                (s.room === room ||
                                    s.doctor === doctor ||
                                    s.patient_id === patient.id) &&
                                mins(s.time) < mins(time) + duration &&
                                mins(s.time) + s.duration > mins(time),
                        )
                    )
                        fail("手术室、医生或顾客时间冲突");
                    id = insert("surgeries", {
                        patient_id: patient.id,
                        doctor,
                        project: str(p.project, "手术项目", 100),
                        date,
                        time,
                        duration,
                        room,
                        nurse: str(p.nurse, "负责护士", 30),
                        status: "待手术",
                        fee: cents(p.fee, "项目费用"),
                        note: str(p.note || "", "备注", 1000, true),
                    });
                    const b = billFor(patient.id, id);
                    line(
                        b,
                        p.project,
                        "诊疗项目",
                        1,
                        cents(p.fee, "项目费用"),
                        `手术 S${id}`,
                    );
                    activity(
                        "新增手术安排",
                        `${patient.name} · ${p.project} · ${room}`,
                        "surgery",
                    );
                    break;
                }
                case "surgery.status": {
                    const s = requireRow("surgeries", p.id);
                    const next = { 待手术: "进行中", 进行中: "已完成" };
                    if (next[s.status] !== p.status)
                        fail("当前手术状态不能执行此操作");
                    update("surgeries", s.id, { status: p.status });
                    id = s.id;
                    activity(
                        "手术进度更新",
                        `${requireRow("patients", s.patient_id).name} · ${s.project} · ${p.status}`,
                        "surgery",
                    );
                    break;
                }
                case "consumption.create": {
                    const s = requireRow("surgeries", p.surgery_id);
                    if (s.status === "待手术")
                        fail("请先开始手术，再登记实际耗材");
                    if (
                        !Array.isArray(p.items) ||
                        !p.items.length ||
                        p.items.length > 30
                    )
                        fail("请至少选择一项耗材");
                    const bill = billFor(s.patient_id, s.id);
                    for (const entry of p.items) {
                        const item = requireRow("inventory", entry.item_id);
                        const q = num(
                            entry.quantity,
                            "耗材数量",
                            1,
                            100000,
                            true,
                        );
                        if (item.stock < q)
                            fail(
                                `${item.name} 库存不足（可用 ${item.stock} ${item.unit}）`,
                            );
                        if (item.expiry < today())
                            fail(`${item.name} 已过期，不能领用`);
                        insert("consumptions", {
                            surgery_id: s.id,
                            item_id: item.id,
                            quantity: q,
                            price: item.price,
                            created_at: new Date().toISOString(),
                        });
                        movement(item, -q, "手术领用", `手术 S${s.id}`);
                        line(
                            bill,
                            item.name,
                            "手术耗材",
                            q,
                            item.price,
                            `手术 S${s.id}`,
                        );
                    }
                    activity(
                        "手术耗材完成登记",
                        `${requireRow("patients", s.patient_id).name} · ${p.items.length} 项耗材已扣库存并计入费用`,
                        "surgery",
                    );
                    id = s.id;
                    break;
                }
                case "bed.assign": {
                    const b = requireRow("beds", p.id),
                        patient = requireRow("patients", p.patient_id);
                    if (b.status !== "空闲") fail("该床位当前不可入住");
                    if (
                        one(
                            "SELECT id FROM beds WHERE patient_id=?",
                            patient.id,
                        )
                    )
                        fail("该顾客已经入住，请勿重复分配");
                    update("beds", b.id, {
                        patient_id: patient.id,
                        status: "使用中",
                        admitted_at: today(),
                    });
                    activity(
                        "床位入住登记",
                        `${patient.name} · ${b.ward} ${b.code}`,
                        "bed",
                    );
                    id = b.id;
                    break;
                }
                case "bed.discharge": {
                    const b = requireRow("beds", p.id);
                    if (b.status !== "使用中" || !b.patient_id)
                        fail("该床位没有住院顾客");
                    const days = Math.max(
                        1,
                        Math.ceil(
                            (Date.parse(today()) - Date.parse(b.admitted_at)) /
                                86400000,
                        ),
                    );
                    const bill = billFor(b.patient_id);
                    line(
                        bill,
                        `${b.code} ${b.type}（${days} 天）`,
                        "床位护理",
                        days,
                        b.rate,
                        `床位 ${b.code}`,
                    );
                    activity(
                        "出院登记完成",
                        `${requireRow("patients", b.patient_id).name} · ${b.code} · 床位费已计入账单`,
                        "bed",
                    );
                    update("beds", b.id, {
                        patient_id: null,
                        status: "待清洁",
                        admitted_at: null,
                    });
                    id = b.id;
                    break;
                }
                case "bed.clean": {
                    const b = requireRow("beds", p.id);
                    if (b.status !== "待清洁") fail("仅待清洁床位可执行此操作");
                    update("beds", b.id, { status: "空闲" });
                    activity("床位清洁完成", `${b.code} · 可安排入住`, "bed");
                    id = b.id;
                    break;
                }
                case "inventory.create": {
                    const stock = num(p.stock, "期初库存", 0, 1000000, true);
                    const expiry = dateValue(p.expiry);
                    const name = str(p.name, "物资名称", 100),
                        batch = str(p.batch, "生产批次", 80);
                    if (
                        one(
                            "SELECT id FROM inventory WHERE name=? AND batch=?",
                            name,
                            batch,
                        )
                    )
                        fail("同名物资的该批次已存在，请通过采购补货");
                    id = insert("inventory", {
                        name,
                        spec: str(p.spec, "规格", 100),
                        category: choice(
                            p.category,
                            [
                                "手术耗材",
                                "高值耗材",
                                "护理耗材",
                                "防护用品",
                                "医疗器械",
                                "消毒用品",
                            ],
                            "分类",
                        ),
                        unit: str(p.unit, "单位", 10),
                        stock,
                        minimum: num(p.minimum, "安全库存", 0, 1000000, true),
                        cost: cents(p.cost, "成本单价"),
                        price: cents(p.price, "收费单价"),
                        batch,
                        expiry,
                        supplier: str(p.supplier, "供应商", 100),
                        warehouse: choice(
                            p.warehouse,
                            ["中心库", "手术室库"],
                            "仓库",
                        ),
                    });
                    insert("movements", {
                        item_id: id,
                        type: "期初入库",
                        quantity: stock,
                        balance: stock,
                        reference: "新建物资",
                        created_at: new Date().toISOString(),
                    });
                    activity("新增物资档案", `${name} · ${batch}`, "inventory");
                    break;
                }
                case "purchase.create": {
                    const item = requireRow("inventory", p.item_id);
                    id = insert("purchases", {
                        item_id: item.id,
                        supplier: str(p.supplier, "供应商", 100),
                        quantity: num(p.quantity, "采购数量", 1, 100000, true),
                        cost: cents(p.cost, "进货单价"),
                        date: today(),
                        status: "待入库",
                        note: str(p.note || "", "备注", 1000, true),
                    });
                    activity(
                        "采购单已创建",
                        `${item.name} · 待验收入库`,
                        "inventory",
                    );
                    break;
                }
                case "purchase.receive": {
                    const pch = requireRow("purchases", p.id);
                    if (pch.status !== "待入库")
                        fail("此采购单已入库，请勿重复提交");
                    const item = requireRow("inventory", pch.item_id);
                    movement(
                        item,
                        pch.quantity,
                        "采购入库",
                        `采购 CG${pch.id}`,
                    );
                    update("inventory", item.id, {
                        cost: Math.round(
                            (item.stock * item.cost + pch.quantity * pch.cost) /
                                (item.stock + pch.quantity),
                        ),
                    });
                    update("purchases", pch.id, { status: "已入库" });
                    id = pch.id;
                    activity(
                        "采购验收入库",
                        `${item.name} · +${pch.quantity} ${item.unit}`,
                        "inventory",
                    );
                    break;
                }
                case "inventory.count": {
                    const item = requireRow("inventory", p.item_id);
                    const stock = num(p.stock, "实盘数量", 0, 1000000, true);
                    const reason = str(p.reason, "盘点原因", 200);
                    const diff = stock - item.stock;
                    if (diff === 0) fail("实盘数量与账面一致，无需调整");
                    movement(
                        item,
                        diff,
                        diff > 0 ? "盘盈入库" : "盘亏出库",
                        reason,
                    );
                    id = item.id;
                    activity(
                        "库存盘点完成",
                        `${item.name} · ${item.stock} → ${stock} ${item.unit}`,
                        "inventory",
                    );
                    break;
                }
                case "bill.confirm": {
                    const b = requireRow("bills", p.id);
                    if (b.status !== "待核对") fail("此账单已经核对");
                    update("bills", b.id, { status: "待收款" });
                    id = b.id;
                    activity(
                        "费用核对完成",
                        `${requireRow("patients", b.patient_id).name} · 账单 ZD${b.id}`,
                        "finance",
                    );
                    break;
                }
                case "bill.pay": {
                    const b = requireRow("bills", p.id);
                    if (b.status !== "待收款")
                        fail("请先核对账单，已结清账单不能重复收款");
                    if (
                        b.surgery_id &&
                        requireRow("surgeries", b.surgery_id).status !==
                            "已完成"
                    )
                        fail("请在手术完成、耗材登记结束后结清账单");
                    update("bills", b.id, {
                        status: "已结清",
                        method: choice(
                            p.method,
                            ["微信支付", "支付宝", "银行卡", "现金"],
                            "收款方式",
                        ),
                        paid_at: new Date().toISOString(),
                    });
                    id = b.id;
                    activity(
                        "账单收款完成",
                        `${requireRow("patients", b.patient_id).name} · ${p.method}`,
                        "finance",
                    );
                    break;
                }
                case "demo.reset": {
                    if (p.confirm !== "RESET_DEMO") fail("需要确认重置");
                    for (const table of [
                        "bill_lines",
                        "bills",
                        "consumptions",
                        "movements",
                        "purchases",
                        "beds",
                        "surgeries",
                        "records",
                        "appointments",
                        "inventory",
                        "patients",
                        "activities",
                        "meta",
                    ])
                        db.exec(`DELETE FROM ${table}`);
                    seed();
                    break;
                }
                default:
                    fail("操作不存在", 404);
            }
            return { id: id ?? null };
        });
    }
    return { db, snapshot, mutate, close: () => db.close() };
}
