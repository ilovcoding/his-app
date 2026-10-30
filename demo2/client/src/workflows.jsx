import React, { useEffect, useState } from "react";
import {
    Alert,
    App,
    Avatar,
    Button,
    DatePicker,
    Descriptions,
    Divider,
    Drawer,
    Empty,
    Form,
    Input,
    InputNumber,
    Modal,
    Popconfirm,
    Select,
    Space,
    Steps,
    Table,
    Tabs,
    Tag,
    Timeline,
} from "antd";
import {
    AccountBookOutlined,
    ArrowRightOutlined,
    CalendarOutlined,
    CheckCircleOutlined,
    DeleteOutlined,
    FileTextOutlined,
    HomeOutlined,
    InboxOutlined,
    MedicineBoxOutlined,
    PlusOutlined,
    SaveOutlined,
    UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useClinic } from "./context.js";
import { DataTable, ExportButton, money, Person, Status } from "./shared.jsx";
const req = [{ required: true, message: "请填写此项" }];
const options = (arr) => arr.map((value) => ({ value, label: value }));
const field = (name, label, child, rules = req) => (
    <Form.Item name={name} label={label} rules={rules}>
        {child}
    </Form.Item>
);
const timeOptions = Array.from({ length: 25 }, (_, i) => {
    const h = 8 + Math.floor(i / 2),
        m = i % 2 ? "30" : "00";
    return {
        value: `${String(h).padStart(2, "0")}:${m}`,
        label: `${String(h).padStart(2, "0")}:${m}`,
    };
});
const titles = {
    patient: "新建顾客档案",
    appointment: "新增面诊预约",
    record: "诊疗病历",
    surgery: "安排手术",
    consumption: "登记手术耗材",
    bed: "安排床位入住",
    purchase: "创建采购单",
    count: "库存盘点",
    payment: "确认账单收款",
    inventory: "新增物资",
};
export function ActionForm({ state, onClose }) {
    const { data, act } = useClinic();
    const { message } = App.useApp();
    const [form] = Form.useForm();
    const [busy, setBusy] = useState(false);
    const type = state?.type,
        archived = type === "record" && state?.status === "已归档";
    const selectedItem = Form.useWatch("item_id", form),
        quantity = Form.useWatch("quantity", form),
        cost = Form.useWatch("cost", form),
        items = Form.useWatch("items", form),
        countStock = Form.useWatch("stock", form);
    const inventory = data.inventory.find((i) => i.id === selectedItem);
    const surgery = data.surgeries.find((s) => s.id === state?.surgery_id);
    const bed = data.beds.find((b) => b.id === state?.bed_id);
    const bill = data.bills.find((b) => b.id === state?.bill_id);
    useEffect(() => {
        if (!state) return;
        form.resetFields();
        const item = data.inventory.find((i) => i.id === state.item_id);
        form.setFieldsValue({
            gender: "女",
            category: state.type === "inventory" ? "手术耗材" : "普通顾客",
            allergies: "无已知过敏",
            doctor: data.doctors[0].name,
            time: "09:00",
            age: 28,
            duration: 90,
            room: "手术室 A",
            nurse: "吴晓敏",
            fee: 6800,
            quantity: 1,
            cost: item ? item.cost / 100 : undefined,
            supplier: item?.supplier,
            stock: item?.stock,
            items: [{ quantity: 1 }],
            method: "微信支付",
            unit: "包",
            minimum: 20,
            warehouse: "中心库",
            expiry: dayjs(data.today).add(1, "year"),
            ...state,
            date: dayjs(state.date || data.today),
            type: state.type === "appointment" ? "初诊" : state.type,
        });
    }, [state]);
    const patientSelect = (
        <Select
            showSearch
            optionFilterProp="label"
            placeholder="选择已有顾客"
            options={data.patients.map((p) => ({
                value: p.id,
                label: `${p.name} · ${p.phone}`,
            }))}
        />
    );
    const doctorSelect = (
        <Select
            options={data.doctors.map((d) => ({
                value: d.name,
                label: `${d.name} · ${d.department}`,
            }))}
        />
    );
    const itemSelect = (
        <Select
            showSearch
            optionFilterProp="label"
            placeholder="选择物资"
            options={data.inventory.map((i) => ({
                value: i.id,
                label: `${i.name} · 库存 ${i.stock} ${i.unit}`,
            }))}
        />
    );
    const onValuesChange = (changed) => {
        if (changed.item_id && (type === "purchase" || type === "count")) {
            const i = data.inventory.find((v) => v.id === changed.item_id);
            form.setFieldsValue({
                cost: i.cost / 100,
                supplier: i.supplier,
                stock: i.stock,
            });
        }
    };
    const submit = async (status) => {
        try {
            const values = await form.validateFields();
            setBusy(true);
            let payload = { ...values };
            if (payload.date) payload.date = payload.date.format("YYYY-MM-DD");
            if (payload.expiry)
                payload.expiry = payload.expiry.format("YYYY-MM-DD");
            let action;
            switch (type) {
                case "patient":
                    action = "patient.create";
                    break;
                case "appointment":
                    action = "appointment.create";
                    break;
                case "record":
                    action = "record.save";
                    payload.id = state.record_id;
                    payload.status = status || "草稿";
                    break;
                case "surgery":
                    action = "surgery.create";
                    break;
                case "consumption":
                    action = "consumption.create";
                    payload.surgery_id = state.surgery_id;
                    break;
                case "bed":
                    action = "bed.assign";
                    payload.id = state.bed_id;
                    break;
                case "purchase":
                    action = "purchase.create";
                    break;
                case "count":
                    action = "inventory.count";
                    break;
                case "payment":
                    action = "bill.pay";
                    payload.id = state.bill_id;
                    break;
                case "inventory":
                    action = "inventory.create";
                    break;
            }
            await act(
                action,
                payload,
                type === "consumption"
                    ? "耗材已登记，库存与费用已同步"
                    : type === "record" && status === "已归档"
                      ? "病历已归档"
                      : "保存成功",
            );
            onClose();
        } catch (e) {
            if (!e.errorFields) message.error(e.message);
        } finally {
            setBusy(false);
        }
    };
    const submitLabel = {
        patient: "创建档案",
        appointment: "确认预约",
        record: "保存草稿",
        surgery: "确认手术安排",
        consumption: "确认登记并扣减库存",
        bed: "确认入住",
        purchase: "创建采购单",
        count: "确认盘点调整",
        payment: "确认已收款",
        inventory: "保存物资",
    }[type];
    return (
        <Modal
            open={!!state}
            title={titles[type]}
            width={type === "record" ? 820 : type === "consumption" ? 760 : 620}
            onCancel={onClose}
            destroyOnHidden
            mask={{ closable: !busy }}
            closable={!busy}
            footer={
                archived ? (
                    <Button onClick={onClose}>关闭</Button>
                ) : (
                    <Space>
                        <Button onClick={onClose} disabled={busy}>
                            取消
                        </Button>
                        {type === "record" && (
                            <Button
                                loading={busy}
                                onClick={() => submit("草稿")}
                                icon={<SaveOutlined />}
                            >
                                保存草稿
                            </Button>
                        )}
                        <Button
                            type="primary"
                            loading={busy}
                            onClick={() =>
                                submit(type === "record" ? "已归档" : undefined)
                            }
                        >
                            {type === "record" ? "确认归档" : submitLabel}
                        </Button>
                    </Space>
                )
            }
        >
            <Form
                form={form}
                layout="vertical"
                disabled={archived || busy}
                onValuesChange={onValuesChange}
                className="workflow-form"
            >
                {type === "patient" && (
                    <>
                        <div className="form-intro">
                            <UserOutlined />{" "}
                            建立档案后，可关联预约、病历、手术与费用。
                        </div>
                        <div className="form-grid">
                            {field(
                                "name",
                                "顾客姓名",
                                <Input
                                    placeholder="请输入姓名"
                                    maxLength={30}
                                />,
                            )}
                            {field(
                                "phone",
                                "联系电话",
                                <Input
                                    placeholder="11 位手机号"
                                    maxLength={11}
                                />,
                                [
                                    ...req,
                                    {
                                        pattern: /^1\d{10}$/,
                                        message: "请输入正确的 11 位手机号",
                                    },
                                ],
                            )}
                            {field(
                                "gender",
                                "性别",
                                <Select options={options(["女", "男"])} />,
                            )}
                            {field(
                                "age",
                                "年龄",
                                <InputNumber
                                    min={0}
                                    max={120}
                                    precision={0}
                                    addonAfter="岁"
                                />,
                            )}
                            {field(
                                "category",
                                "顾客类型",
                                <Select
                                    options={options(["普通顾客", "VIP"])}
                                />,
                            )}
                            {field(
                                "allergies",
                                "过敏史",
                                <Input placeholder="无已知过敏" />,
                            )}
                        </div>
                        {field(
                            "note",
                            "备注信息",
                            <Input.TextArea
                                rows={3}
                                placeholder="服务偏好、特殊事项等"
                            />,
                            [],
                        )}
                    </>
                )}
                {type === "appointment" && (
                    <>
                        <div className="form-intro">
                            <CalendarOutlined /> 预约按 30
                            分钟一个时段安排，同一医生不可重复预约。
                        </div>
                        {field("patient_id", "顾客", patientSelect)}
                        <div className="form-grid">
                            {field("doctor", "接诊医生", doctorSelect)}
                            {field(
                                "type",
                                "预约类型",
                                <Select options={options(["初诊", "复诊"])} />,
                            )}
                            {field(
                                "date",
                                "预约日期",
                                <DatePicker allowClear={false} />,
                            )}
                            {field(
                                "time",
                                "预约时间",
                                <Select options={timeOptions} />,
                            )}
                        </div>
                        {field(
                            "project",
                            "预约项目",
                            <Input placeholder="例如：眼部综合面诊、术后复查" />,
                        )}
                        {field(
                            "note",
                            "预约备注",
                            <Input.TextArea
                                rows={3}
                                placeholder="请记录需要提前告知医生的事项"
                            />,
                            [],
                        )}
                    </>
                )}
                {type === "record" && (
                    <>
                        <div className="form-intro">
                            <FileTextOutlined />{" "}
                            {archived
                                ? "该病历已归档，保留原始内容供查阅。"
                                : "填写诊疗记录，可先存草稿；归档需填写诊断与诊疗计划。"}
                        </div>
                        <div className="form-grid">
                            {field("patient_id", "顾客", patientSelect)}
                            {field("doctor", "主诊医师", doctorSelect)}
                            {field(
                                "date",
                                "就诊日期",
                                <DatePicker allowClear={false} />,
                            )}
                            <Form.Item label="记录状态">
                                <Status value={state.status || "草稿"} />
                            </Form.Item>
                        </div>
                        {field(
                            "complaint",
                            "主诉",
                            <Input.TextArea
                                rows={2}
                                placeholder="就诊原因与主要诉求"
                            />,
                        )}
                        <div className="form-grid">
                            {field(
                                "history",
                                "现病史 / 既往情况",
                                <Input.TextArea
                                    rows={3}
                                    placeholder="记录相关病史与既往情况"
                                />,
                                [],
                            )}
                            {field(
                                "examination",
                                "检查记录",
                                <Input.TextArea
                                    rows={3}
                                    placeholder="记录本次检查信息"
                                />,
                                [],
                            )}
                        </div>
                        {field(
                            "diagnosis",
                            "诊断 / 评估",
                            <Input.TextArea
                                rows={2}
                                placeholder="由接诊医生填写诊断或评估结果"
                            />,
                            [],
                        )}
                        {field(
                            "plan",
                            "诊疗计划",
                            <Input.TextArea
                                rows={3}
                                placeholder="记录后续诊疗安排与复诊事项"
                            />,
                            [],
                        )}
                    </>
                )}
                {type === "surgery" && (
                    <>
                        <div className="form-intro">
                            <MedicineBoxOutlined />{" "}
                            手术安排会自动创建项目费用账单，耗材按实际领用登记。
                        </div>
                        {field("patient_id", "顾客", patientSelect)}
                        {field(
                            "project",
                            "手术 / 治疗项目",
                            <Input placeholder="例如：眼部综合手术" />,
                        )}
                        <div className="form-grid">
                            {field("doctor", "主诊医生", doctorSelect)}
                            {field(
                                "nurse",
                                "责任护士",
                                <Select
                                    options={options([
                                        "吴晓敏",
                                        "赵可心",
                                        "李安然",
                                    ])}
                                />,
                            )}
                            {field(
                                "date",
                                "手术日期",
                                <DatePicker allowClear={false} />,
                            )}
                            {field(
                                "time",
                                "开始时间",
                                <Select options={timeOptions} />,
                            )}
                            {field(
                                "duration",
                                "预计时长",
                                <InputNumber
                                    min={30}
                                    max={480}
                                    step={30}
                                    precision={0}
                                    addonAfter="分钟"
                                />,
                            )}
                            {field(
                                "room",
                                "手术室",
                                <Select
                                    options={options([
                                        "手术室 A",
                                        "手术室 B",
                                        "治疗室 C",
                                    ])}
                                />,
                            )}
                            {field(
                                "fee",
                                "诊疗项目费用",
                                <InputNumber
                                    min={0}
                                    precision={2}
                                    addonBefore="¥"
                                />,
                            )}
                        </div>
                        {field("note", "备注", <Input.TextArea rows={2} />, [])}
                    </>
                )}
                {type === "consumption" && (
                    <>
                        <div className="consumption-patient">
                            <Person
                                name={surgery?.patient_name}
                                id={surgery?.patient_id}
                            />
                            <div>
                                <b>{surgery?.project}</b>
                                <p>
                                    {surgery?.room} · {surgery?.doctor}
                                </p>
                            </div>
                        </div>
                        <Alert
                            type="info"
                            showIcon
                            title="登记即生效"
                            description="按所选批次扣减实际库存，并将耗材费用同步到顾客账单。请核对用量后提交。"
                        />
                        <Form.List name="items">
                            {(fields, { add, remove }) => (
                                <div className="consumption-list">
                                    {fields.map(({ key, name, ...rest }) => (
                                        <div
                                            className="consumption-row"
                                            key={key}
                                        >
                                            <Form.Item
                                                {...rest}
                                                name={[name, "item_id"]}
                                                label={`耗材 ${name + 1}`}
                                                rules={req}
                                            >
                                                {itemSelect}
                                            </Form.Item>
                                            <Form.Item
                                                {...rest}
                                                name={[name, "quantity"]}
                                                label="使用数量"
                                                rules={req}
                                            >
                                                <InputNumber
                                                    min={1}
                                                    precision={0}
                                                />
                                            </Form.Item>
                                            <Button
                                                aria-label="删除耗材行"
                                                icon={<DeleteOutlined />}
                                                disabled={fields.length === 1}
                                                onClick={() => remove(name)}
                                            />
                                        </div>
                                    ))}
                                    <Button
                                        block
                                        type="dashed"
                                        icon={<PlusOutlined />}
                                        onClick={() => add({ quantity: 1 })}
                                    >
                                        添加一项耗材
                                    </Button>
                                </div>
                            )}
                        </Form.List>
                        <div className="amount-summary">
                            <span>本次登记金额</span>
                            <strong>
                                {money(
                                    (items || []).reduce(
                                        (n, x) =>
                                            n +
                                            (data.inventory.find(
                                                (i) => i.id === x?.item_id,
                                            )?.price || 0) *
                                                (x?.quantity || 0),
                                        0,
                                    ),
                                )}
                            </strong>
                        </div>
                    </>
                )}
                {type === "bed" && (
                    <>
                        <div className="form-intro">
                            <HomeOutlined /> {bed?.ward} · {bed?.code} ·{" "}
                            {bed?.type}
                        </div>
                        <div className="bed-rate">
                            床位护理费用 <b>{money(bed?.rate)} / 天</b>
                        </div>
                        {field(
                            "patient_id",
                            "入住顾客",
                            <Select
                                showSearch
                                optionFilterProp="label"
                                placeholder="选择未入住的顾客"
                                options={data.patients
                                    .filter(
                                        (p) =>
                                            !data.beds.some(
                                                (b) => b.patient_id === p.id,
                                            ),
                                    )
                                    .map((p) => ({
                                        value: p.id,
                                        label: `${p.name} · ${p.phone}`,
                                    }))}
                            />,
                        )}
                        <Alert
                            type="info"
                            showIcon
                            title="入住日期为今天"
                            description="出院时按实际入住天数计算床位费用，不足一天按一天计费，并自动加入待核对账单。"
                        />
                    </>
                )}
                {type === "purchase" && (
                    <>
                        <div className="form-intro">
                            <InboxOutlined />{" "}
                            创建采购单后，在“采购入库”中验收，库存才会更新。
                        </div>
                        {field("item_id", "采购物资", itemSelect)}
                        {inventory && (
                            <p className="muted">
                                批次 {inventory.batch} · 当前库存{" "}
                                {inventory.stock} {inventory.unit} ·{" "}
                                {inventory.warehouse}
                            </p>
                        )}
                        {field(
                            "supplier",
                            "供应商",
                            <Input placeholder="供应商名称" />,
                        )}
                        <div className="form-grid">
                            {field(
                                "quantity",
                                "采购数量",
                                <InputNumber
                                    min={1}
                                    precision={0}
                                    addonAfter={inventory?.unit}
                                />,
                            )}
                            {field(
                                "cost",
                                "进货单价",
                                <InputNumber
                                    min={0}
                                    precision={2}
                                    addonBefore="¥"
                                />,
                            )}
                        </div>
                        {field(
                            "note",
                            "采购备注",
                            <Input.TextArea rows={2} />,
                            [],
                        )}
                        <div className="amount-summary">
                            <span>采购金额</span>
                            <strong>
                                {money(
                                    Math.round(
                                        (quantity || 0) * (cost || 0) * 100,
                                    ),
                                )}
                            </strong>
                        </div>
                    </>
                )}
                {type === "count" && (
                    <>
                        <Alert
                            type="warning"
                            showIcon
                            title="盘点会直接调整库存"
                            description="请填写实际盘点数量与差异原因，确认后将生成盘盈或盘亏流水。"
                        />
                        {field("item_id", "盘点物资", itemSelect)}
                        {inventory && (
                            <div className="stock-compare">
                                <div>
                                    <span>账面数量</span>
                                    <strong>
                                        {inventory.stock}{" "}
                                        <small>{inventory.unit}</small>
                                    </strong>
                                </div>
                                <ArrowRightOutlined />
                                <div>
                                    <span>盘点差异</span>
                                    <strong
                                        className={
                                            countStock < inventory.stock
                                                ? "red-text"
                                                : "green"
                                        }
                                    >
                                        {countStock == null
                                            ? "—"
                                            : countStock - inventory.stock}
                                    </strong>
                                </div>
                            </div>
                        )}
                        {field(
                            "stock",
                            "实盘数量",
                            <InputNumber
                                min={0}
                                precision={0}
                                addonAfter={inventory?.unit}
                            />,
                        )}
                        {field(
                            "reason",
                            "差异原因",
                            <Input.TextArea
                                rows={3}
                                placeholder="例如：月末盘点、报损、漏记入库等"
                            />,
                        )}
                    </>
                )}
                {type === "payment" && (
                    <>
                        <div className="form-intro">
                            <AccountBookOutlined />{" "}
                            请确认款项已经实际到账后，再登记收款。
                        </div>
                        <Person
                            name={bill?.patient_name}
                            id={bill?.patient_id}
                        />
                        <div className="payment-amount">
                            <span>本次应收金额</span>
                            <strong>{money(bill?.total)}</strong>
                            <small>
                                账单 ZD{String(bill?.id || "").padStart(5, "0")}
                            </small>
                        </div>
                        {field(
                            "method",
                            "收款方式",
                            <Select
                                options={options([
                                    "微信支付",
                                    "支付宝",
                                    "银行卡",
                                    "现金",
                                ])}
                            />,
                        )}
                        <Alert
                            showIcon
                            type="info"
                            title="演示收款登记"
                            description="仅记录收款状态，不会发起真实支付或连接支付平台。"
                        />
                    </>
                )}
                {type === "inventory" && (
                    <>
                        <div className="form-intro">
                            <InboxOutlined />{" "}
                            每个物资记录对应一个批次，新批次请新建物资记录。
                        </div>
                        <div className="form-grid">
                            {field(
                                "name",
                                "物资名称",
                                <Input placeholder="例如：医用无菌手套" />,
                            )}
                            {field(
                                "spec",
                                "规格型号",
                                <Input placeholder="例如：7号 / 独立包装" />,
                            )}
                            {field(
                                "category",
                                "物资分类",
                                <Select
                                    options={options([
                                        "手术耗材",
                                        "高值耗材",
                                        "护理耗材",
                                        "防护用品",
                                        "医疗器械",
                                        "消毒用品",
                                    ])}
                                />,
                            )}
                            {field(
                                "unit",
                                "计量单位",
                                <Select
                                    options={options([
                                        "包",
                                        "支",
                                        "瓶",
                                        "片",
                                        "双",
                                        "根",
                                        "套",
                                        "卷",
                                        "个",
                                    ])}
                                />,
                            )}
                            {field(
                                "stock",
                                "期初库存",
                                <InputNumber min={0} precision={0} />,
                            )}
                            {field(
                                "minimum",
                                "安全库存",
                                <InputNumber min={0} precision={0} />,
                            )}
                            {field(
                                "cost",
                                "成本单价",
                                <InputNumber
                                    min={0}
                                    precision={2}
                                    addonBefore="¥"
                                />,
                            )}
                            {field(
                                "price",
                                "收费单价",
                                <InputNumber
                                    min={0}
                                    precision={2}
                                    addonBefore="¥"
                                />,
                            )}
                            {field(
                                "batch",
                                "生产批次",
                                <Input placeholder="LOT202610001" />,
                            )}
                            {field(
                                "expiry",
                                "有效期至",
                                <DatePicker allowClear={false} />,
                            )}
                            {field("supplier", "供应商", <Input />)}
                            {field(
                                "warehouse",
                                "所在仓库",
                                <Select
                                    options={options(["中心库", "手术室库"])}
                                />,
                            )}
                        </div>
                    </>
                )}
            </Form>
        </Modal>
    );
}

export function PatientDetail({ id, onClose }) {
    const { data, openForm, openDetail } = useClinic();
    const p = data.patients.find((p) => p.id === id);
    if (!p) return null;
    const records = data.records.filter((r) => r.patient_id === id),
        visits = data.appointments.filter((a) => a.patient_id === id),
        bills = data.bills.filter((b) => b.patient_id === id),
        bed = data.beds.find((b) => b.patient_id === id);
    return (
        <Drawer
            title="顾客全景档案"
            open={!!id}
            onClose={onClose}
            size={780}
            extra={
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => openForm("appointment", { patient_id: id })}
                >
                    新增预约
                </Button>
            }
        >
            <div className="profile-hero">
                <Avatar
                    size={66}
                    style={{
                        background: "#e6f2ed",
                        color: "#497b68",
                        fontSize: 24,
                    }}
                >
                    {p.name.slice(-2)}
                </Avatar>
                <div>
                    <h2>
                        {p.name}
                        <Tag color={p.category === "VIP" ? "gold" : "default"}>
                            {p.category}
                        </Tag>
                    </h2>
                    <p>
                        {p.gender} · {p.age} 岁 <span>｜</span> {p.phone}
                    </p>
                    <small>
                        顾客编号 CH{String(p.id).padStart(5, "0")} ·{" "}
                        {p.created_at} 建档
                    </small>
                </div>
            </div>
            {p.allergies !== "无已知过敏" && (
                <Alert
                    type="warning"
                    showIcon
                    title={`过敏提醒：${p.allergies}`}
                />
            )}
            <div className="profile-stats">
                <div>
                    <b>{visits.length}</b>
                    <span>预约记录</span>
                </div>
                <div>
                    <b>{records.length}</b>
                    <span>诊疗病历</span>
                </div>
                <div>
                    <b>{money(bills.reduce((n, b) => n + b.total, 0))}</b>
                    <span>累计账单金额</span>
                </div>
                <div>
                    <b>{bed?.code || "—"}</b>
                    <span>当前床位</span>
                </div>
            </div>
            <Tabs
                items={[
                    {
                        key: "overview",
                        label: "就诊概览",
                        children: (
                            <>
                                <Descriptions
                                    column={2}
                                    size="small"
                                    items={[
                                        {
                                            key: "allergy",
                                            label: "过敏史",
                                            children: p.allergies,
                                        },
                                        {
                                            key: "note",
                                            label: "服务备注",
                                            children: p.note || "暂无",
                                        },
                                    ]}
                                />
                                <Divider />
                                <h3>就诊时间线</h3>
                                <Timeline
                                    items={visits
                                        .slice()
                                        .reverse()
                                        .slice(0, 10)
                                        .map((a) => ({
                                            color:
                                                a.status === "已完成"
                                                    ? "#0a8177"
                                                    : "#b9c8c8",
                                            content: (
                                                <div className="visit-entry">
                                                    <small>
                                                        {a.date} {a.time}
                                                    </small>
                                                    <h4>
                                                        {a.project}
                                                        <Status
                                                            value={a.status}
                                                        />
                                                    </h4>
                                                    <p>
                                                        {a.doctor} ·{" "}
                                                        {a.department} ·{" "}
                                                        {a.type}
                                                    </p>
                                                </div>
                                            ),
                                        }))}
                                />
                            </>
                        ),
                    },
                    {
                        key: "records",
                        label: `诊疗病历 (${records.length})`,
                        children: (
                            <>
                                <div className="drawer-toolbar">
                                    <Button
                                        type="primary"
                                        icon={<PlusOutlined />}
                                        onClick={() =>
                                            openForm("record", {
                                                patient_id: id,
                                            })
                                        }
                                    >
                                        书写新病历
                                    </Button>
                                </div>
                                {records.map((r) => (
                                    <div className="record-preview" key={r.id}>
                                        <div>
                                            <b>
                                                {r.date} · {r.doctor}
                                            </b>
                                            <Status value={r.status} />
                                        </div>
                                        <h4>{r.diagnosis || "诊断待补充"}</h4>
                                        <p>{r.complaint}</p>
                                        <Button
                                            type="link"
                                            onClick={() =>
                                                openForm("record", {
                                                    ...r,
                                                    record_id: r.id,
                                                })
                                            }
                                        >
                                            {r.status === "草稿"
                                                ? "继续编辑"
                                                : "查看全文"}{" "}
                                            <ArrowRightOutlined />
                                        </Button>
                                    </div>
                                ))}
                                {!records.length && (
                                    <Empty description="暂无病历，可新建一份诊疗记录" />
                                )}
                            </>
                        ),
                    },
                    {
                        key: "finance",
                        label: `消费账单 (${bills.length})`,
                        children: (
                            <DataTable
                                data={bills}
                                columns={[
                                    {
                                        title: "账单编号",
                                        render: (_, b) =>
                                            `ZD${String(b.id).padStart(5, "0")}`,
                                    },
                                    {
                                        title: "金额",
                                        dataIndex: "total",
                                        render: money,
                                    },
                                    {
                                        title: "状态",
                                        dataIndex: "status",
                                        render: (v) => <Status value={v} />,
                                    },
                                    {
                                        title: "操作",
                                        render: (_, b) => (
                                            <Button
                                                type="link"
                                                onClick={() =>
                                                    openDetail("bill", b.id)
                                                }
                                            >
                                                费用明细
                                            </Button>
                                        ),
                                    },
                                ]}
                            />
                        ),
                    },
                ]}
            />
        </Drawer>
    );
}

export function SurgeryDetail({ id, onClose }) {
    const { data, perform, openForm, openDetail } = useClinic();
    const s = data.surgeries.find((s) => s.id === id);
    if (!s) return null;
    const rows = data.consumptions.filter((c) => c.surgery_id === id),
        bill = data.bills.find((b) => b.surgery_id === id);
    const paid = bill?.status === "已结清";
    const current = { 待手术: 0, 进行中: 1, 已完成: 2 }[s.status];
    return (
        <Drawer
            title={`手术详情 · S${String(id).padStart(5, "0")}`}
            open={!!id}
            onClose={onClose}
            size={820}
            footer={
                <div className="drawer-footer">
                    <Button onClick={onClose}>关闭</Button>
                    <Space>
                        {bill && (
                            <Button onClick={() => openDetail("bill", bill.id)}>
                                查看关联账单
                            </Button>
                        )}
                        {s.status !== "已完成" && (
                            <Popconfirm
                                title={
                                    s.status === "待手术"
                                        ? "确认开始手术？"
                                        : "确认手术已完成？"
                                }
                                onConfirm={() =>
                                    perform(
                                        "surgery.status",
                                        {
                                            id,
                                            status:
                                                s.status === "待手术"
                                                    ? "进行中"
                                                    : "已完成",
                                        },
                                        "手术状态已更新",
                                    )
                                }
                            >
                                <Button type="primary">
                                    {s.status === "待手术"
                                        ? "开始手术"
                                        : "完成手术"}
                                </Button>
                            </Popconfirm>
                        )}
                    </Space>
                </div>
            }
        >
            <div className="surgery-hero">
                <div>
                    <Tag color="cyan" variant="filled">
                        {s.room}
                    </Tag>
                    <h2>{s.project}</h2>
                    <p>
                        {s.date} {s.time} · 预计 {s.duration} 分钟
                    </p>
                </div>
                <Status value={s.status} />
            </div>
            <Steps
                className="surgery-steps"
                current={current}
                items={[
                    { title: "术前准备" },
                    { title: "手术进行中" },
                    { title: "手术完成" },
                ]}
            />
            <Descriptions
                bordered
                size="small"
                column={2}
                items={[
                    {
                        key: "patient",
                        label: "顾客",
                        children: (
                            <a
                                onClick={() =>
                                    openDetail("patient", s.patient_id)
                                }
                            >
                                {s.patient_name} · {s.gender} · {s.age} 岁
                            </a>
                        ),
                    },
                    { key: "doctor", label: "主诊医生", children: s.doctor },
                    { key: "nurse", label: "责任护士", children: s.nurse },
                    { key: "fee", label: "项目费用", children: money(s.fee) },
                    {
                        key: "allergy",
                        label: "过敏信息",
                        children: (
                            <span
                                className={
                                    s.allergies === "无已知过敏"
                                        ? ""
                                        : "red-text"
                                }
                            >
                                {s.allergies}
                            </span>
                        ),
                    },
                    { key: "note", label: "备注", children: s.note || "—" },
                ]}
            />
            <div className="section-title">
                <div>
                    <h3>实际耗材登记</h3>
                    <p>每次领用自动扣库存，同步费用账单</p>
                </div>
                <Button
                    type="primary"
                    ghost
                    icon={<PlusOutlined />}
                    disabled={s.status === "待手术" || paid}
                    onClick={() => openForm("consumption", { surgery_id: id })}
                >
                    登记耗材
                </Button>
            </div>
            {s.status === "待手术" && (
                <Alert
                    type="info"
                    showIcon
                    title="开始手术后，可以登记实际使用的耗材。"
                />
            )}
            {paid && (
                <Alert
                    type="success"
                    showIcon
                    title="费用已结清，耗材登记已锁定。"
                />
            )}
            <DataTable
                data={rows}
                columns={[
                    { title: "耗材名称", dataIndex: "name" },
                    { title: "批次", dataIndex: "batch" },
                    {
                        title: "数量",
                        render: (_, r) => `${r.quantity} ${r.unit}`,
                    },
                    { title: "单价", dataIndex: "price", render: money },
                    {
                        title: "金额",
                        render: (_, r) => <b>{money(r.price * r.quantity)}</b>,
                    },
                ]}
            />
            <div className="amount-summary">
                <span>耗材合计</span>
                <strong>
                    {money(rows.reduce((n, r) => n + r.quantity * r.price, 0))}
                </strong>
            </div>
        </Drawer>
    );
}

export function BillDetail({ id, onClose }) {
    const { data, perform, openForm } = useClinic();
    const b = data.bills.find((b) => b.id === id);
    if (!b) return null;
    const lines = data.billLines.filter((l) => l.bill_id === id);
    const operation = data.surgeries.find((s) => s.id === b.surgery_id);
    const unfinished = operation && operation.status !== "已完成";
    return (
        <Drawer
            title="顾客费用明细"
            open={!!id}
            onClose={onClose}
            size={820}
            footer={
                <div className="drawer-footer">
                    <span className="muted">
                        {b.status === "已结清"
                            ? `收款方式：${b.method}`
                            : "请核对全部费用明细后确认"}
                    </span>
                    <Space>
                        <Button onClick={onClose}>关闭</Button>
                        {b.status === "待核对" && (
                            <Popconfirm
                                title="确认项目与耗材明细无误？"
                                onConfirm={() =>
                                    perform(
                                        "bill.confirm",
                                        { id },
                                        "费用已核对，可登记收款",
                                    )
                                }
                            >
                                <Button
                                    type="primary"
                                    icon={<CheckCircleOutlined />}
                                >
                                    确认核对无误
                                </Button>
                            </Popconfirm>
                        )}
                        {b.status === "待收款" && (
                            <Button
                                type="primary"
                                disabled={unfinished}
                                onClick={() =>
                                    openForm("payment", { bill_id: id })
                                }
                            >
                                登记收款
                            </Button>
                        )}
                    </Space>
                </div>
            }
        >
            <div className="bill-header">
                <div>
                    <h2>费用核对单</h2>
                    <p>
                        ZD{String(id).padStart(5, "0")} <span>·</span> {b.date}
                    </p>
                </div>
                <Status value={b.status} />
            </div>
            <div className="bill-person">
                <Person name={b.patient_name} id={b.patient_id} sub={b.phone} />
                <div>
                    <small>账单总额</small>
                    <strong>{money(b.total)}</strong>
                </div>
            </div>
            {unfinished && (
                <Alert
                    type="info"
                    showIcon
                    title="关联手术尚未完成"
                    description="可以先核对费用，手术完成且耗材登记结束后再结清。"
                />
            )}
            {["诊疗项目", "手术耗材", "床位护理"]
                .filter((c) => lines.some((l) => l.category === c))
                .map((category) => (
                    <div key={category} className="bill-section">
                        <h3>
                            <span />
                            {category}
                            <small>
                                {
                                    lines.filter((l) => l.category === category)
                                        .length
                                }{" "}
                                项
                            </small>
                        </h3>
                        <DataTable
                            data={lines.filter((l) => l.category === category)}
                            pageSize={100}
                            columns={[
                                {
                                    title: "项目名称",
                                    dataIndex: "name",
                                    width: 270,
                                },
                                { title: "数量", dataIndex: "quantity" },
                                {
                                    title: "单价",
                                    dataIndex: "price",
                                    render: money,
                                },
                                {
                                    title: "金额",
                                    align: "right",
                                    render: (_, l) => (
                                        <b>{money(l.quantity * l.price)}</b>
                                    ),
                                },
                            ]}
                        />
                    </div>
                ))}
            <div className="bill-total">
                <div>
                    <span>项目合计</span>
                    <b>{lines.length} 项</b>
                </div>
                <div>
                    <span>账单应收</span>
                    <strong>{money(b.total)}</strong>
                </div>
                {b.status === "已结清" && (
                    <div>
                        <span>收款时间</span>
                        <b>{dayjs(b.paid_at).format("YYYY-MM-DD HH:mm")}</b>
                    </div>
                )}
            </div>
            <ExportButton
                name={`费用明细-ZD${id}`}
                rows={[
                    [
                        "顾客",
                        "账单",
                        "项目",
                        "分类",
                        "数量",
                        "单价(元)",
                        "金额(元)",
                    ],
                    ...lines.map((l) => [
                        b.patient_name,
                        `ZD${id}`,
                        l.name,
                        l.category,
                        l.quantity,
                        (l.price / 100).toFixed(2),
                        ((l.price * l.quantity) / 100).toFixed(2),
                    ]),
                ]}
            />
        </Drawer>
    );
}
