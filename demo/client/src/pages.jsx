import React, { useState } from "react";
import {
    Alert,
    Avatar,
    Button,
    DatePicker,
    Empty,
    Popconfirm,
    Progress,
    Segmented,
    Select,
    Space,
    Table,
    Tabs,
    Tag,
    Tooltip,
} from "antd";
import {
    AccountBookOutlined,
    ArrowDownOutlined,
    ArrowRightOutlined,
    ArrowUpOutlined,
    CalendarOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    FileTextOutlined,
    HomeOutlined,
    InboxOutlined,
    MedicineBoxOutlined,
    PlusOutlined,
    ReloadOutlined,
    ScheduleOutlined,
    TeamOutlined,
    WarningOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useClinic } from "./context.js";
import {
    DataTable,
    ExportButton,
    match,
    Metric,
    money,
    number,
    PageTitle,
    Panel,
    Person,
    SearchBox,
    Status,
} from "./shared.jsx";
import {
    AreaChart,
    OccupancyChart,
    DepartmentChart,
    AppointmentCalendar,
    SurgeryRooms,
} from "./visuals.jsx";
const sum = (arr, fn) => arr.reduce((a, b) => a + fn(b), 0);
const patientCols = (openDetail) => [
    {
        title: "顾客信息",
        key: "patient",
        width: 175,
        render: (_, r) => (
            <Person
                name={r.patient_name}
                id={r.patient_id}
                gender={r.gender}
                onClick={() => openDetail("patient", r.patient_id)}
            />
        ),
    },
];
const dateButtons = (date, setDate) => (
    <Space size={5}>
        <Button
            aria-label="上一天"
            onClick={() =>
                setDate(dayjs(date).subtract(1, "day").format("YYYY-MM-DD"))
            }
        >
            ‹
        </Button>
        <DatePicker
            allowClear={false}
            value={dayjs(date)}
            onChange={(d) => setDate(d.format("YYYY-MM-DD"))}
        />
        <Button
            aria-label="下一天"
            onClick={() =>
                setDate(dayjs(date).add(1, "day").format("YYYY-MM-DD"))
            }
        >
            ›
        </Button>
        <Button onClick={() => setDate(dayjs().format("YYYY-MM-DD"))}>
            今天
        </Button>
    </Space>
);

export function Dashboard() {
    const { data, navigate, openForm, openDetail } = useClinic();
    const [period, setPeriod] = useState(7);
    const visits = data.appointments.filter(
        (a) => a.date === data.today && a.status !== "已取消",
    );
    const ops = data.surgeries.filter((s) => s.date === data.today);
    const used = data.beds.filter((b) => b.status === "使用中").length;
    const pending = data.bills.filter((b) => b.status === "待核对");
    const low = data.inventory.filter((i) => i.stock < i.minimum);
    const trend = Array.from({ length: period }, (_, i) => {
        const date = dayjs(data.today)
            .subtract(period - 1 - i, "day")
            .format("YYYY-MM-DD");
        return {
            date,
            count: data.appointments.filter(
                (a) => a.date === date && a.status !== "已取消",
            ).length,
        };
    });
    const departments = [...new Set(data.doctors.map((d) => d.department))].map(
        (name) => ({
            name,
            count: visits.filter((a) => a.department === name).length,
        }),
    );
    const waiting = visits.filter((a) =>
        ["待到院", "已到院", "接诊中"].includes(a.status),
    );
    return (
        <>
            <PageTitle
                title="数据总览"
                description="诊疗有序，照护有温度。院区运营动态，一屏掌握。"
                extra={
                    <>
                        <span className="heading-date">
                            <CalendarOutlined />{" "}
                            {dayjs(data.today).format("M月D日 · dddd")}
                        </span>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => openForm("appointment")}
                        >
                            新增预约
                        </Button>
                    </>
                }
            />
            <div className="metrics-grid overview-metrics">
                <Metric
                    title="今日面诊"
                    value={visits.length}
                    unit="人"
                    icon={<TeamOutlined />}
                    sub={
                        <>
                            <span className="blue">
                                {
                                    visits.filter((a) => a.status === "已完成")
                                        .length
                                }{" "}
                                人已完成
                            </span>
                            <span>今日接诊进度</span>
                        </>
                    }
                />
                <Metric
                    title="在院照护"
                    value={used}
                    unit="人"
                    tone="blue"
                    icon={<HomeOutlined />}
                    sub={
                        <>
                            <span className="blue">
                                {
                                    data.beds.filter((b) => b.status === "空闲")
                                        .length
                                }{" "}
                                床可入住
                            </span>
                            <span>病房实时状态</span>
                        </>
                    }
                />
                <Metric
                    title="今日手术"
                    value={ops.length}
                    unit="台"
                    tone="purple"
                    icon={<MedicineBoxOutlined />}
                    sub={
                        <>
                            <span className="blue">
                                {
                                    ops.filter((o) => o.status === "进行中")
                                        .length
                                }{" "}
                                台进行中
                            </span>
                            <span>医护协同安排</span>
                        </>
                    }
                />
                <Metric
                    title="待核对账单"
                    value={pending.length}
                    unit="笔"
                    tone="amber"
                    icon={<AccountBookOutlined />}
                    sub={
                        <>
                            <span className="blue">
                                {money(sum(pending, (b) => b.total))}
                            </span>
                            <span>项目与耗材费用</span>
                        </>
                    }
                />
            </div>
            <div className="overview-chart-grid">
                <Panel
                    title="门诊趋势"
                    subtitle="按预约日期统计 · 已取消预约不计入"
                    className="trend-panel"
                    extra={
                        <Segmented
                            size="small"
                            value={period}
                            onChange={setPeriod}
                            options={[
                                { label: "近7天", value: 7 },
                                { label: "近14天", value: 14 },
                                { label: "近30天", value: 30 },
                            ]}
                        />
                    }
                >
                    <div className="chart-summary">
                        <strong>
                            {sum(trend, (t) => t.count)}
                            <small>人次</small>
                        </strong>
                        <span>近 {period} 天预约总量</span>
                        <i />
                        <span className="chart-key">面诊预约</span>
                    </div>
                    <AreaChart data={trend} />
                </Panel>
                <Panel
                    title="床位使用情况"
                    subtitle="实时床态与在院照护"
                    extra={
                        <Button type="link" onClick={() => navigate("beds")}>
                            详情 <ArrowRightOutlined />
                        </Button>
                    }
                >
                    <OccupancyChart beds={data.beds} />
                </Panel>
            </div>
            <div className="overview-lower-grid">
                <Panel
                    title="科室分布"
                    subtitle="今日门诊预约量"
                    extra={
                        <Tag color="blue" variant="filled">
                            {departments.length} 个科室
                        </Tag>
                    }
                >
                    <DepartmentChart data={departments} />
                </Panel>
                <Panel
                    title="近期动态"
                    subtitle="院内协作，实时留痕"
                    className="activity-panel"
                    extra={
                        <span className="sync-label">
                            <i />
                            实时更新
                        </span>
                    }
                >
                    <div className="activity-feed">
                        {data.activities.slice(0, 4).map((a, i) => (
                            <div className="activity-row" key={a.id}>
                                <span className={"activity-point point-" + i} />
                                <div>
                                    <b>{a.title}</b>
                                    <p>{a.detail}</p>
                                </div>
                                <time>
                                    {dayjs(a.created_at).format("HH:mm")}
                                </time>
                            </div>
                        ))}
                        {!data.activities.length && (
                            <Empty description="暂无业务动态" />
                        )}
                    </div>
                </Panel>
                <Panel
                    title="工作提醒"
                    subtitle="把重要的事放在眼前"
                    className="work-reminders"
                >
                    <button onClick={() => navigate("appointments")}>
                        <span className="reminder-symbol">
                            <CalendarOutlined />
                        </span>
                        <span>
                            <b>待接诊顾客</b>
                            <small>到院登记与医生接诊</small>
                        </span>
                        <strong>{waiting.length}</strong>
                        <ArrowRightOutlined />
                    </button>
                    <button onClick={() => navigate("finance")}>
                        <span className="reminder-symbol">
                            <AccountBookOutlined />
                        </span>
                        <span>
                            <b>费用待核对</b>
                            <small>项目、耗材、床位明细</small>
                        </span>
                        <strong>{pending.length}</strong>
                        <ArrowRightOutlined />
                    </button>
                    <button onClick={() => navigate("inventory")}>
                        <span className="reminder-symbol amber">
                            <InboxOutlined />
                        </span>
                        <span>
                            <b>库存待关注</b>
                            <small>低于安全库存的耗材</small>
                        </span>
                        <strong>{low.length}</strong>
                        <ArrowRightOutlined />
                    </button>
                </Panel>
            </div>
            <Panel
                title="今日诊疗安排"
                subtitle="从预约到接诊，全程有序"
                extra={
                    <Button
                        type="link"
                        onClick={() => navigate("appointments")}
                    >
                        全部预约 <ArrowRightOutlined />
                    </Button>
                }
            >
                <DataTable
                    pageSize={5}
                    data={visits
                        .slice()
                        .sort((a, b) => a.time.localeCompare(b.time))}
                    columns={[
                        {
                            title: "时间",
                            dataIndex: "time",
                            render: (v) => (
                                <span className="time-badge">
                                    <ClockCircleOutlined /> {v}
                                </span>
                            ),
                        },
                        ...patientCols(openDetail),
                        { title: "诊疗项目", dataIndex: "project" },
                        { title: "接诊医生", dataIndex: "doctor" },
                        { title: "科室", dataIndex: "department" },
                        {
                            title: "状态",
                            dataIndex: "status",
                            render: (v) => <Status value={v} />,
                        },
                        {
                            title: "操作",
                            render: (_, r) => (
                                <Button
                                    type="link"
                                    onClick={() =>
                                        openDetail("patient", r.patient_id)
                                    }
                                >
                                    查看档案
                                </Button>
                            ),
                        },
                    ]}
                />
            </Panel>
        </>
    );
}

export function Appointments() {
    const { data, openForm, openDetail, perform, search, setSearch } =
        useClinic();
    const [date, setDate] = useState(data.today),
        [view, setView] = useState("列表视图"),
        [status, setStatus] = useState("全部"),
        [doctor, setDoctor] = useState("全部医生");
    const base = data.appointments.filter((a) => a.date === date);
    const rows = base.filter(
        (a) =>
            (status === "全部" || a.status === status) &&
            (doctor === "全部医生" || a.doctor === doctor) &&
            match(search, a.patient_name, a.phone, a.project),
    );
    const statusNext = {
        待到院: ["已到院", "登记到院"],
        已到院: ["接诊中", "开始接诊"],
        接诊中: ["已完成", "完成接诊"],
    };
    const cols = [
        {
            title: "预约时间",
            dataIndex: "time",
            width: 100,
            render: (t) => (
                <span className="time-badge">
                    <ClockCircleOutlined /> {t}
                </span>
            ),
        },
        ...patientCols(openDetail),
        { title: "预约项目", dataIndex: "project" },
        {
            title: "接诊医生",
            dataIndex: "doctor",
            render: (v, r) => (
                <div className="stacked-cell">
                    <b>{v}</b>
                    <small>{r.department}</small>
                </div>
            ),
        },
        {
            title: "就诊类型",
            dataIndex: "type",
            render: (v) => (
                <Tag variant="filled" color={v === "初诊" ? "blue" : "default"}>
                    {v}
                </Tag>
            ),
        },
        {
            title: "当前状态",
            dataIndex: "status",
            render: (v) => <Status value={v} />,
        },
        {
            title: "操作",
            key: "action",
            render: (_, r) => (
                <Space>
                    {statusNext[r.status] && (
                        <Button
                            size="small"
                            type="link"
                            onClick={() =>
                                perform(
                                    "appointment.status",
                                    {
                                        id: r.id,
                                        status: statusNext[r.status][0],
                                    },
                                    "预约状态已更新",
                                )
                            }
                        >
                            {statusNext[r.status][1]}
                        </Button>
                    )}
                    <Button
                        size="small"
                        type="link"
                        onClick={() =>
                            openForm("record", {
                                patient_id: r.patient_id,
                                doctor: r.doctor,
                            })
                        }
                    >
                        写病历
                    </Button>
                    {["待到院", "已到院"].includes(r.status) && (
                        <Popconfirm
                            title="确认取消这次预约？"
                            onConfirm={() =>
                                perform(
                                    "appointment.status",
                                    { id: r.id, status: "已取消" },
                                    "预约已取消",
                                )
                            }
                        >
                            <Button type="text" size="small" className="muted">
                                取消
                            </Button>
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];
    return (
        <>
            <PageTitle
                title="面诊预约"
                description="清晰安排每一次就诊，让医生与顾客的时间都有序可循。"
                extra={
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => openForm("appointment", { date })}
                    >
                        新增预约
                    </Button>
                }
            />
            <div className="summary-strip">
                {["全部", "待到院", "已到院", "接诊中", "已完成"].map((s) => (
                    <button
                        className={status === s ? "selected" : ""}
                        key={s}
                        onClick={() => setStatus(s)}
                    >
                        <span>{s === "全部" ? "当日预约" : s}</span>
                        <b>
                            {s === "全部"
                                ? base.length
                                : base.filter((a) => a.status === s).length}
                        </b>
                    </button>
                ))}
            </div>
            <div className="appointment-insights">
                <AppointmentCalendar
                    date={date}
                    setDate={setDate}
                    appointments={data.appointments}
                />
                <Panel
                    title="当日接诊进度"
                    subtitle="预约 · 到院 · 接诊 · 完成"
                    className="visit-progress-panel"
                >
                    <div className="visit-progress-number">
                        <strong>
                            {base.filter((a) => a.status === "已完成").length}
                            <small>
                                {" "}
                                /{" "}
                                {
                                    base.filter((a) => a.status !== "已取消")
                                        .length
                                }{" "}
                                人
                            </small>
                        </strong>
                        <Tag color="blue" variant="filled">
                            已完成接诊
                        </Tag>
                    </div>
                    <Progress
                        percent={Math.round(
                            (base.filter((a) => a.status === "已完成").length /
                                Math.max(
                                    1,
                                    base.filter((a) => a.status !== "已取消")
                                        .length,
                                )) *
                                100,
                        )}
                        strokeColor={{ "0%": "#56a4ff", "100%": "#2368ff" }}
                    />
                    <div className="visit-stages">
                        {["待到院", "已到院", "接诊中", "已完成"].map(
                            (s, i) => (
                                <div key={s}>
                                    <span>{i + 1}</span>
                                    <b>{s}</b>
                                    <small>
                                        {
                                            base.filter((a) => a.status === s)
                                                .length
                                        }{" "}
                                        人
                                    </small>
                                </div>
                            ),
                        )}
                    </div>
                </Panel>
            </div>
            <Panel>
                <div className="table-toolbar">
                    <Space wrap>
                        {dateButtons(date, setDate)}
                        <Select
                            value={doctor}
                            onChange={setDoctor}
                            style={{ width: 145 }}
                            options={[
                                "全部医生",
                                ...data.doctors.map((d) => d.name),
                            ].map((value) => ({ value, label: value }))}
                        />
                    </Space>
                    <Segmented
                        value={view}
                        onChange={setView}
                        options={["列表视图", "医生看板"]}
                    />
                </div>
                <div className="table-toolbar secondary">
                    <SearchBox value={search} onChange={setSearch} />
                    <ExportButton
                        name="面诊预约"
                        rows={[
                            ["日期", "时间", "姓名", "医生", "项目", "状态"],
                            ...rows.map((r) => [
                                r.date,
                                r.time,
                                r.patient_name,
                                r.doctor,
                                r.project,
                                r.status,
                            ]),
                        ]}
                    />
                </div>
                {view === "列表视图" ? (
                    <DataTable columns={cols} data={rows} />
                ) : (
                    <div className="doctor-board">
                        {data.doctors
                            .filter(
                                (d) =>
                                    doctor === "全部医生" || d.name === doctor,
                            )
                            .map((d) => (
                                <div className="doctor-column" key={d.name}>
                                    <div className="doctor-head">
                                        <Avatar style={{ background: d.color }}>
                                            {d.initial}
                                        </Avatar>
                                        <div>
                                            <b>{d.name}</b>
                                            <small>
                                                {d.department} · {d.room}
                                            </small>
                                        </div>
                                        <Tag>
                                            {
                                                rows.filter(
                                                    (a) => a.doctor === d.name,
                                                ).length
                                            }
                                        </Tag>
                                    </div>
                                    <div className="doctor-slots">
                                        {rows
                                            .filter((a) => a.doctor === d.name)
                                            .map((a) => (
                                                <button
                                                    className={
                                                        "appointment-card " +
                                                        (a.status === "已取消"
                                                            ? "canceled"
                                                            : "")
                                                    }
                                                    key={a.id}
                                                    onClick={() =>
                                                        openDetail(
                                                            "patient",
                                                            a.patient_id,
                                                        )
                                                    }
                                                >
                                                    <div>
                                                        <b>{a.time}</b>
                                                        <Status
                                                            value={a.status}
                                                        />
                                                    </div>
                                                    <h4>
                                                        {a.patient_name}
                                                        <small>
                                                            {a.gender} · {a.age}{" "}
                                                            岁
                                                        </small>
                                                    </h4>
                                                    <p>{a.project}</p>
                                                </button>
                                            ))}
                                        <Button
                                            block
                                            type="dashed"
                                            icon={<PlusOutlined />}
                                            onClick={() =>
                                                openForm("appointment", {
                                                    doctor: d.name,
                                                    date,
                                                })
                                            }
                                        >
                                            添加预约
                                        </Button>
                                    </div>
                                </div>
                            ))}
                    </div>
                )}
            </Panel>
        </>
    );
}

export function Patients() {
    const { data, openForm, openDetail, search, setSearch } = useClinic();
    const [category, setCategory] = useState("全部顾客");
    const rows = data.patients.filter(
        (p) =>
            match(
                search,
                p.name,
                p.phone,
                `CH${String(p.id).padStart(5, "0")}`,
            ) &&
            (category === "全部顾客" || p.category === category),
    );
    return (
        <>
            <PageTitle
                title="顾客档案"
                description="将预约、病历、诊疗与消费记录，归于一份完整档案。"
                extra={
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => openForm("patient")}
                    >
                        新建顾客档案
                    </Button>
                }
            />
            <div className="metrics-grid compact">
                <Metric
                    title="顾客档案"
                    value={data.patients.length}
                    unit="位"
                    icon={<TeamOutlined />}
                    sub="完整记录每一次诊疗"
                />
                <Metric
                    title="VIP 顾客"
                    value={
                        data.patients.filter((p) => p.category === "VIP").length
                    }
                    unit="位"
                    tone="amber"
                    icon={<TeamOutlined />}
                    sub="持续关注个性化服务"
                />
                <Metric
                    title="今日就诊顾客"
                    value={
                        new Set(
                            data.appointments
                                .filter(
                                    (a) =>
                                        a.date === data.today &&
                                        a.status !== "已取消",
                                )
                                .map((a) => a.patient_id),
                        ).size
                    }
                    unit="位"
                    tone="blue"
                    icon={<CalendarOutlined />}
                    sub="当天有效面诊预约"
                />
                <Metric
                    title="住院顾客"
                    value={data.beds.filter((b) => b.patient_id).length}
                    unit="位"
                    tone="purple"
                    icon={<HomeOutlined />}
                    sub="护理与床位信息同步"
                />
            </div>
            <Panel>
                <div className="table-toolbar">
                    <Segmented
                        options={["全部顾客", "普通顾客", "VIP"]}
                        value={category}
                        onChange={setCategory}
                    />
                    <SearchBox value={search} onChange={setSearch} />
                </div>
                <DataTable
                    data={rows}
                    columns={[
                        {
                            title: "顾客信息",
                            render: (_, p) => (
                                <Person
                                    name={p.name}
                                    id={p.id}
                                    gender={p.gender}
                                    onClick={() => openDetail("patient", p.id)}
                                />
                            ),
                        },
                        {
                            title: "性别 / 年龄",
                            render: (_, p) => `${p.gender} / ${p.age} 岁`,
                        },
                        { title: "联系电话", dataIndex: "phone" },
                        {
                            title: "顾客类型",
                            dataIndex: "category",
                            render: (v) => (
                                <Tag
                                    color={v === "VIP" ? "gold" : "default"}
                                    variant="filled"
                                >
                                    {v}
                                </Tag>
                            ),
                        },
                        {
                            title: "过敏信息",
                            dataIndex: "allergies",
                            render: (v) => (
                                <span
                                    className={
                                        v !== "无已知过敏" ? "red-text" : ""
                                    }
                                >
                                    {v}
                                </span>
                            ),
                        },
                        { title: "建档时间", dataIndex: "created_at" },
                        {
                            title: "操作",
                            render: (_, p) => (
                                <Space>
                                    <Button
                                        size="small"
                                        type="link"
                                        onClick={() =>
                                            openDetail("patient", p.id)
                                        }
                                    >
                                        查看档案
                                    </Button>
                                    <Button
                                        size="small"
                                        type="link"
                                        onClick={() =>
                                            openForm("appointment", {
                                                patient_id: p.id,
                                            })
                                        }
                                    >
                                        预约
                                    </Button>
                                </Space>
                            ),
                        },
                    ]}
                />
            </Panel>
        </>
    );
}

export function Records() {
    const { data, openForm, openDetail, search, setSearch } = useClinic();
    const [selected, setSelected] = useState(
            data.records[0]?.patient_id || data.patients[0]?.id,
        ),
        [recordId, setRecordId] = useState(null),
        [status, setStatus] = useState("全部病历");
    const patientRecordOrder = new Map();
    data.records.forEach((r, i) => {
        if (!patientRecordOrder.has(r.patient_id))
            patientRecordOrder.set(r.patient_id, i);
    });
    const patients = data.patients
        .filter(
            (p) =>
                match(search, p.name, p.phone) &&
                (status === "全部病历" ||
                    data.records.some(
                        (r) => r.patient_id === p.id && r.status === status,
                    )),
        )
        .sort(
            (a, b) =>
                (patientRecordOrder.get(a.id) ?? 9999) -
                (patientRecordOrder.get(b.id) ?? 9999),
        );
    const patient = patients.find((p) => p.id === selected) || patients[0];
    const records = data.records
        .filter(
            (r) =>
                r.patient_id === patient?.id &&
                (status === "全部病历" || r.status === status),
        )
        .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
    const record = records.find((r) => r.id === recordId) || records[0];
    return (
        <>
            <PageTitle
                title="电子病历"
                description="以顾客为中心，连接每一次诊疗记录。"
                extra={
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() =>
                            openForm(
                                "record",
                                patient ? { patient_id: patient.id } : {},
                            )
                        }
                    >
                        新建病历
                    </Button>
                }
            />
            <div className="records-workspace">
                <Panel
                    title="顾客列表"
                    extra={
                        <Tag color="blue" variant="filled">
                            {patients.length} 人
                        </Tag>
                    }
                    className="record-patient-panel"
                >
                    <div className="record-search">
                        <SearchBox value={search} onChange={setSearch} />
                        <Segmented
                            block
                            size="small"
                            options={["全部病历", "草稿", "已归档"]}
                            value={status}
                            onChange={setStatus}
                        />
                    </div>
                    <div className="record-patients">
                        {patients.map((p) => {
                            const rs = data.records.filter(
                                (r) => r.patient_id === p.id,
                            );
                            return (
                                <button
                                    key={p.id}
                                    className={
                                        p.id === patient?.id ? "active" : ""
                                    }
                                    onClick={() => {
                                        setSelected(p.id);
                                        setRecordId(null);
                                    }}
                                >
                                    <Avatar size={40}>
                                        {p.name.slice(-2)}
                                    </Avatar>
                                    <span>
                                        <b>
                                            {p.name}
                                            <small>
                                                {p.gender} · {p.age}岁
                                            </small>
                                        </b>
                                        <p>
                                            {rs.length
                                                ? rs[0].diagnosis ||
                                                  "待完善诊疗记录"
                                                : "暂无诊疗记录"}
                                        </p>
                                    </span>
                                    <small>{rs.length} 份</small>
                                </button>
                            );
                        })}
                        {!patients.length && (
                            <Empty description="没有符合条件的顾客" />
                        )}
                    </div>
                </Panel>
                <div className="record-content">
                    {patient ? (
                        <>
                            <div className="record-profile">
                                <Avatar size={60}>
                                    {patient.name.slice(-2)}
                                </Avatar>
                                <div>
                                    <h2>
                                        {patient.name}
                                        <Tag color="blue" variant="filled">
                                            {patient.category}
                                        </Tag>
                                    </h2>
                                    <p>
                                        {patient.gender} · {patient.age} 岁{" "}
                                        <i /> CH
                                        {String(patient.id).padStart(
                                            5,
                                            "0",
                                        )}{" "}
                                        <i />
                                        {patient.phone}
                                    </p>
                                </div>
                                <Button
                                    onClick={() =>
                                        openDetail("patient", patient.id)
                                    }
                                >
                                    完整档案 <ArrowRightOutlined />
                                </Button>
                                <div className="record-profile-facts">
                                    <span>
                                        过敏史{" "}
                                        <b>{patient.allergies || "未填写"}</b>
                                    </span>
                                    <span>
                                        病历记录{" "}
                                        <b>
                                            {
                                                data.records.filter(
                                                    (r) =>
                                                        r.patient_id ===
                                                        patient.id,
                                                ).length
                                            }{" "}
                                            份
                                        </b>
                                    </span>
                                    <span>
                                        预约记录{" "}
                                        <b>
                                            {
                                                data.appointments.filter(
                                                    (a) =>
                                                        a.patient_id ===
                                                        patient.id,
                                                ).length
                                            }{" "}
                                            次
                                        </b>
                                    </span>
                                </div>
                            </div>
                            <Panel
                                title="诊疗记录"
                                extra={
                                    record && (
                                        <Space>
                                            <Status value={record.status} />
                                            <Button
                                                type="primary"
                                                size="small"
                                                onClick={() =>
                                                    openForm("record", {
                                                        ...record,
                                                        record_id: record.id,
                                                    })
                                                }
                                            >
                                                {record.status === "草稿"
                                                    ? "继续书写"
                                                    : "查看完整病历"}
                                            </Button>
                                        </Space>
                                    )
                                }
                                className="record-document"
                            >
                                {record ? (
                                    <>
                                        <div className="record-document-meta">
                                            <span>
                                                <CalendarOutlined />{" "}
                                                {record.date}
                                            </span>
                                            <span>
                                                主诊医师：{record.doctor}
                                            </span>
                                            <span className="code-text">
                                                BL
                                                {String(record.id).padStart(
                                                    5,
                                                    "0",
                                                )}
                                            </span>
                                        </div>
                                        <div className="clinical-sections">
                                            {[
                                                ["主诉", "complaint"],
                                                ["现病史", "history"],
                                                ["检查记录", "examination"],
                                                ["诊断", "diagnosis"],
                                                ["诊疗计划", "plan"],
                                            ].map(([label, key], i) => (
                                                <section
                                                    key={key}
                                                    className={
                                                        key === "diagnosis"
                                                            ? "diagnosis-section"
                                                            : ""
                                                    }
                                                >
                                                    <h4>
                                                        <span>
                                                            {String(
                                                                i + 1,
                                                            ).padStart(2, "0")}
                                                        </span>
                                                        {label}
                                                    </h4>
                                                    <p>
                                                        {record[key] ||
                                                            "尚未填写，待医师补充。"}
                                                    </p>
                                                </section>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div className="record-empty">
                                        <Empty description="暂无病历记录" />
                                        <Button
                                            type="primary"
                                            onClick={() =>
                                                openForm("record", {
                                                    patient_id: patient.id,
                                                })
                                            }
                                        >
                                            开始书写病历
                                        </Button>
                                    </div>
                                )}
                            </Panel>
                            <Panel
                                title="就诊记录时间线"
                                extra={
                                    <span className="muted">
                                        {records.length} 份病历
                                    </span>
                                }
                            >
                                <div className="record-history">
                                    {records.map((r) => (
                                        <button
                                            key={r.id}
                                            className={
                                                r.id === record?.id
                                                    ? "active"
                                                    : ""
                                            }
                                            onClick={() => setRecordId(r.id)}
                                        >
                                            <span className="history-point" />
                                            <time>{r.date}</time>
                                            <b>
                                                {r.diagnosis ||
                                                    "待完善诊疗记录"}
                                            </b>
                                            <span>{r.doctor}</span>
                                            <Status value={r.status} />
                                            <ArrowRightOutlined />
                                        </button>
                                    ))}
                                    {!records.length && (
                                        <p className="muted">
                                            完成首次就诊记录后，将在这里展示。
                                        </p>
                                    )}
                                </div>
                            </Panel>
                        </>
                    ) : (
                        <Empty description="请选择顾客" />
                    )}
                </div>
            </div>
        </>
    );
}

export function Surgeries() {
    const { data, openForm, openDetail, search, setSearch } = useClinic();
    const [date, setDate] = useState(data.today),
        [status, setStatus] = useState("全部");
    const base = data.surgeries.filter((s) => s.date === date);
    const rows = base.filter(
        (s) =>
            (status === "全部" || s.status === status) &&
            match(search, s.patient_name, s.project, s.doctor),
    );
    return (
        <>
            <PageTitle
                title="手术与耗材"
                description="从手术安排到耗材领用，每一项使用都可追溯。"
                extra={
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => openForm("surgery", { date })}
                    >
                        安排手术
                    </Button>
                }
            />
            <div className="metrics-grid compact">
                <Metric
                    title="当日手术"
                    value={base.length}
                    unit="台"
                    icon={<MedicineBoxOutlined />}
                    sub="按当前选择日期统计"
                />
                <Metric
                    title="手术进行中"
                    value={base.filter((s) => s.status === "进行中").length}
                    unit="台"
                    tone="purple"
                    icon={<ClockCircleOutlined />}
                    sub="及时登记实际使用耗材"
                />
                <Metric
                    title="已完成手术"
                    value={base.filter((s) => s.status === "已完成").length}
                    unit="台"
                    tone="blue"
                    icon={<CheckCircleOutlined />}
                    sub="待财务完成费用结算"
                />
                <Metric
                    title="当日耗材金额"
                    value={money(
                        sum(
                            data.consumptions.filter((c) =>
                                base.some((s) => s.id === c.surgery_id),
                            ),
                            (c) => c.quantity * c.price,
                        ),
                    )}
                    icon={<InboxOutlined />}
                    tone="amber"
                    sub="按登记时收费单价计算"
                />
            </div>
            <SurgeryRooms
                surgeries={base}
                onSelect={(id) => openDetail("surgery", id)}
            />
            <Panel>
                <div className="table-toolbar">
                    {dateButtons(date, setDate)}
                    <Space>
                        <Segmented
                            value={status}
                            onChange={setStatus}
                            options={["全部", "待手术", "进行中", "已完成"]}
                        />
                        <SearchBox
                            value={search}
                            onChange={setSearch}
                            placeholder="搜索顾客、手术或医生"
                        />
                    </Space>
                </div>
                <DataTable
                    data={rows}
                    columns={[
                        {
                            title: "手术时间",
                            dataIndex: "time",
                            render: (v, r) => (
                                <div className="stacked-cell">
                                    <b className="time-text">{v}</b>
                                    <small>{r.duration} 分钟</small>
                                </div>
                            ),
                        },
                        ...patientCols(openDetail),
                        { title: "手术项目", dataIndex: "project" },
                        {
                            title: "手术室",
                            dataIndex: "room",
                            render: (v) => <Tag variant="filled">{v}</Tag>,
                        },
                        {
                            title: "医护团队",
                            render: (_, r) => (
                                <div className="stacked-cell">
                                    <b>{r.doctor}</b>
                                    <small>护士 · {r.nurse}</small>
                                </div>
                            ),
                        },
                        {
                            title: "状态",
                            dataIndex: "status",
                            render: (v) => <Status value={v} />,
                        },
                        {
                            title: "耗材记录",
                            render: (_, r) =>
                                `${data.consumptions.filter((c) => c.surgery_id === r.id).length} 条`,
                        },
                        {
                            title: "操作",
                            render: (_, r) => (
                                <Button
                                    type="link"
                                    onClick={() => openDetail("surgery", r.id)}
                                >
                                    手术详情 <ArrowRightOutlined />
                                </Button>
                            ),
                        },
                    ]}
                />
            </Panel>
            <div className="process-note">
                <CheckCircleOutlined />{" "}
                耗材登记后，库存自动扣减，费用自动同步至顾客账单。支持按批次追溯与库存不足校验。
            </div>
        </>
    );
}

export function Beds() {
    const { data, openForm, openDetail, perform } = useClinic();
    const [ward, setWard] = useState("全部病区"),
        [status, setStatus] = useState("全部状态");
    const rows = data.beds.filter(
        (b) =>
            (ward === "全部病区" || b.ward === ward) &&
            (status === "全部状态" || b.status === status),
    );
    return (
        <>
            <PageTitle
                title="病房床位"
                description="照护安排一目了然，让每一次入住都安心有序。"
                extra={
                    <Tag color="cyan" className="large-tag">
                        实时床态 · {data.beds.length} 张床位
                    </Tag>
                }
            />
            <div className="summary-strip beds-summary">
                {[
                    ["全部状态", "全部床位"],
                    ["使用中", "在院照护"],
                    ["空闲", "可安排入住"],
                    ["待清洁", "等待清洁"],
                ].map(([s, label]) => (
                    <button
                        key={s}
                        className={s === status ? "selected" : ""}
                        onClick={() => setStatus(s)}
                    >
                        <span>{label}</span>
                        <b>
                            {s === "全部状态"
                                ? data.beds.length
                                : data.beds.filter((b) => b.status === s)
                                      .length}
                        </b>
                    </button>
                ))}
            </div>
            <div className="table-toolbar bed-toolbar">
                <Segmented
                    value={ward}
                    onChange={setWard}
                    options={[
                        "全部病区",
                        ...new Set(data.beds.map((b) => b.ward)),
                    ]}
                />
                <span className="muted">
                    <span className="live-dot" /> 床位与顾客档案实时关联
                </span>
            </div>
            <div className="ward-workspace">
                <div className="ward-main">
                    {[...new Set(rows.map((b) => b.ward))].map((w) => (
                        <section className="ward-section" key={w}>
                            <div className="ward-title">
                                <h3>{w}</h3>
                                <span>
                                    {rows.filter((b) => b.ward === w).length}{" "}
                                    张床位
                                </span>
                            </div>
                            <div className="bed-grid">
                                {rows
                                    .filter((b) => b.ward === w)
                                    .map((b) => (
                                        <div
                                            key={b.id}
                                            className={
                                                "bed-card " +
                                                (b.status === "使用中"
                                                    ? "occupied"
                                                    : b.status === "待清洁"
                                                      ? "cleaning"
                                                      : "available")
                                            }
                                        >
                                            <div className="bed-card-top">
                                                <div>
                                                    <HomeOutlined />
                                                    <strong>{b.code}</strong>
                                                </div>
                                                <Status value={b.status} />
                                            </div>
                                            <p className="bed-type">
                                                {b.type}
                                                <span>
                                                    {money(b.rate)} / 天
                                                </span>
                                            </p>
                                            {b.patient_id ? (
                                                <>
                                                    <div className="bed-patient">
                                                        <Person
                                                            name={
                                                                b.patient_name
                                                            }
                                                            id={b.patient_id}
                                                            onClick={() =>
                                                                openDetail(
                                                                    "patient",
                                                                    b.patient_id,
                                                                )
                                                            }
                                                        />
                                                        <Tag variant="filled">
                                                            住院中
                                                        </Tag>
                                                    </div>
                                                    <div className="bed-meta">
                                                        <span>
                                                            入住日期{" "}
                                                            <b>
                                                                {b.admitted_at}
                                                            </b>
                                                        </span>
                                                        <span>
                                                            责任护士{" "}
                                                            <b>{b.nurse}</b>
                                                        </span>
                                                    </div>
                                                    <Popconfirm
                                                        title="确认办理出院？"
                                                        description="床位费将按入住天数计入账单，床位进入待清洁状态。"
                                                        onConfirm={() =>
                                                            perform(
                                                                "bed.discharge",
                                                                { id: b.id },
                                                                "已办理出院并生成床位费用",
                                                            )
                                                        }
                                                    >
                                                        <Button block>
                                                            办理出院
                                                        </Button>
                                                    </Popconfirm>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="empty-bed">
                                                        <HomeOutlined />
                                                        <b>
                                                            {b.status === "空闲"
                                                                ? "床位已准备就绪"
                                                                : "等待清洁与消毒"}
                                                        </b>
                                                        <span>
                                                            {b.status === "空闲"
                                                                ? "可为顾客安排入住"
                                                                : "清洁确认后可继续使用"}
                                                        </span>
                                                    </div>
                                                    <Button
                                                        block
                                                        type={
                                                            b.status === "空闲"
                                                                ? "primary"
                                                                : "default"
                                                        }
                                                        icon={
                                                            b.status ===
                                                            "空闲" ? (
                                                                <PlusOutlined />
                                                            ) : (
                                                                <CheckCircleOutlined />
                                                            )
                                                        }
                                                        onClick={() =>
                                                            b.status === "空闲"
                                                                ? openForm(
                                                                      "bed",
                                                                      {
                                                                          bed_id: b.id,
                                                                      },
                                                                  )
                                                                : perform(
                                                                      "bed.clean",
                                                                      {
                                                                          id: b.id,
                                                                      },
                                                                      "清洁完成，床位可入住",
                                                                  )
                                                        }
                                                    >
                                                        {b.status === "空闲"
                                                            ? "安排入住"
                                                            : "确认清洁完成"}
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    ))}
                            </div>
                        </section>
                    ))}
                    {!rows.length && <Empty description="没有符合条件的床位" />}
                </div>
                <aside className="ward-aside">
                    <Panel title="床位使用情况" subtitle="全院床位实时分布">
                        <OccupancyChart beds={data.beds} compact />
                    </Panel>
                    <Panel title="护理安排" subtitle="在院顾客责任护士">
                        <div className="nurse-assignments">
                            {[
                                ...new Set(
                                    data.beds
                                        .filter((b) => b.patient_id)
                                        .map((b) => b.nurse),
                                ),
                            ].map((n) => (
                                <div key={n}>
                                    <Avatar icon={<TeamOutlined />} />
                                    <span>
                                        <b>{n}</b>
                                        <small>
                                            {data.beds
                                                .filter(
                                                    (b) =>
                                                        b.patient_id &&
                                                        b.nurse === n,
                                                )
                                                .map((b) => b.code)
                                                .join(" · ")}
                                        </small>
                                    </span>
                                    <Tag color="blue" variant="filled">
                                        {
                                            data.beds.filter(
                                                (b) =>
                                                    b.patient_id &&
                                                    b.nurse === n,
                                            ).length
                                        }{" "}
                                        人
                                    </Tag>
                                </div>
                            ))}
                        </div>
                    </Panel>
                    <div className="ward-care-note">
                        <HomeOutlined />
                        <h3>安心照护，有序入住</h3>
                        <p>
                            入住关联顾客档案，出院生成床位费用，清洁完成后即可再次安排。
                        </p>
                    </div>
                </aside>
            </div>
        </>
    );
}

export function Inventory() {
    const { data, openForm, perform, search, setSearch } = useClinic();
    const [tab, setTab] = useState("stock"),
        [category, setCategory] = useState("全部分类"),
        [onlyLow, setOnlyLow] = useState(false);
    const low = data.inventory.filter((i) => i.stock < i.minimum);
    const soon = data.inventory.filter(
        (i) => dayjs(i.expiry).diff(dayjs(data.today), "day") <= 30,
    );
    const rows = data.inventory.filter(
        (i) =>
            match(search, i.name, i.batch, i.supplier) &&
            (category === "全部分类" || i.category === category) &&
            (!onlyLow || i.stock < i.minimum),
    );
    const total = sum(data.inventory, (i) => i.stock * i.cost);
    return (
        <>
            <PageTitle
                title="库存管理"
                description="采购、领用与盘点有迹可循，让每一份物资恰好可用。"
                extra={
                    <>
                        <Button
                            icon={<PlusOutlined />}
                            onClick={() => openForm("inventory")}
                        >
                            新增物资
                        </Button>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => openForm("purchase")}
                        >
                            新增采购单
                        </Button>
                    </>
                }
            />
            <div className="metrics-grid compact">
                <Metric
                    title="在库物资"
                    value={data.inventory.length}
                    unit="种"
                    icon={<InboxOutlined />}
                    sub="中心库与手术室库"
                />
                <Metric
                    title="库存成本金额"
                    value={money(total)}
                    icon={<AccountBookOutlined />}
                    tone="blue"
                    sub="按当前库存 × 成本单价计算"
                />
                <Metric
                    title="低库存预警"
                    value={low.length}
                    unit="项"
                    icon={<WarningOutlined />}
                    tone="amber"
                    sub="低于设定的安全库存"
                />
                <Metric
                    title="30 天内近效期"
                    value={soon.length}
                    unit="项"
                    icon={<ClockCircleOutlined />}
                    tone="red"
                    sub="请及时检查批次与有效期"
                />
            </div>
            <Panel>
                <Tabs
                    activeKey={tab}
                    onChange={setTab}
                    className="panel-tabs"
                    items={[
                        { key: "stock", label: "物资库存" },
                        {
                            key: "purchases",
                            label: (
                                <span>
                                    采购入库{" "}
                                    <span className="tab-count">
                                        {
                                            data.purchases.filter(
                                                (p) => p.status === "待入库",
                                            ).length
                                        }
                                    </span>
                                </span>
                            ),
                        },
                        { key: "movements", label: "出入库流水" },
                    ]}
                />
                {tab === "stock" && (
                    <>
                        <div className="table-toolbar">
                            <Space>
                                <SearchBox
                                    value={search}
                                    onChange={setSearch}
                                    placeholder="搜索物资、批次或供应商"
                                />
                                <Select
                                    value={category}
                                    onChange={setCategory}
                                    style={{ width: 140 }}
                                    options={[
                                        "全部分类",
                                        ...new Set(
                                            data.inventory.map(
                                                (i) => i.category,
                                            ),
                                        ),
                                    ].map((v) => ({ value: v, label: v }))}
                                />
                                <Button
                                    type={onlyLow ? "primary" : "default"}
                                    ghost={onlyLow}
                                    icon={<WarningOutlined />}
                                    onClick={() => setOnlyLow(!onlyLow)}
                                >
                                    只看预警
                                </Button>
                            </Space>
                            <ExportButton
                                name="库存明细"
                                rows={[
                                    [
                                        "物资",
                                        "规格",
                                        "库存",
                                        "单位",
                                        "批次",
                                        "效期",
                                        "仓库",
                                    ],
                                    ...rows.map((i) => [
                                        i.name,
                                        i.spec,
                                        i.stock,
                                        i.unit,
                                        i.batch,
                                        i.expiry,
                                        i.warehouse,
                                    ]),
                                ]}
                            />
                        </div>
                        <DataTable
                            data={rows}
                            columns={[
                                {
                                    title: "物资名称 / 规格",
                                    width: 215,
                                    render: (_, i) => (
                                        <div className="stacked-cell">
                                            <b>{i.name}</b>
                                            <small>{i.spec}</small>
                                        </div>
                                    ),
                                },
                                {
                                    title: "分类",
                                    dataIndex: "category",
                                    render: (v) => (
                                        <Tag variant="filled">{v}</Tag>
                                    ),
                                },
                                {
                                    title: "可用库存",
                                    dataIndex: "stock",
                                    render: (v, i) => (
                                        <div className="stock-quantity">
                                            <b
                                                className={
                                                    v < i.minimum
                                                        ? "red-text"
                                                        : ""
                                                }
                                            >
                                                {v}
                                            </b>{" "}
                                            {i.unit}
                                            {v < i.minimum && (
                                                <Tooltip
                                                    title={`安全库存 ${i.minimum} ${i.unit}`}
                                                >
                                                    <WarningOutlined className="red-text" />
                                                </Tooltip>
                                            )}
                                        </div>
                                    ),
                                },
                                {
                                    title: "批次 / 有效期",
                                    render: (_, i) => (
                                        <div className="stacked-cell">
                                            <span className="code-text">
                                                {i.batch}
                                            </span>
                                            <small
                                                className={
                                                    dayjs(i.expiry).diff(
                                                        dayjs(data.today),
                                                        "day",
                                                    ) <= 30
                                                        ? "amber-text"
                                                        : ""
                                                }
                                            >
                                                {i.expiry}
                                            </small>
                                        </div>
                                    ),
                                },
                                { title: "所在仓库", dataIndex: "warehouse" },
                                {
                                    title: "成本 / 收费单价",
                                    render: (_, i) => (
                                        <div className="stacked-cell">
                                            <span>{money(i.cost)}</span>
                                            <small>{money(i.price)}</small>
                                        </div>
                                    ),
                                },
                                {
                                    title: "操作",
                                    render: (_, i) => (
                                        <Space>
                                            <Button
                                                type="link"
                                                size="small"
                                                onClick={() =>
                                                    openForm("purchase", {
                                                        item_id: i.id,
                                                    })
                                                }
                                            >
                                                采购
                                            </Button>
                                            <Button
                                                type="link"
                                                size="small"
                                                onClick={() =>
                                                    openForm("count", {
                                                        item_id: i.id,
                                                    })
                                                }
                                            >
                                                盘点
                                            </Button>
                                        </Space>
                                    ),
                                },
                            ]}
                        />
                    </>
                )}
                {tab === "purchases" && (
                    <>
                        <div className="table-toolbar">
                            <span className="muted">
                                采购单验收入库后才会增加库存，重复验收会被拦截。
                            </span>
                            <Button
                                onClick={() => openForm("purchase")}
                                icon={<PlusOutlined />}
                            >
                                创建采购单
                            </Button>
                        </div>
                        <DataTable
                            data={data.purchases}
                            columns={[
                                {
                                    title: "采购单号",
                                    render: (_, p) => (
                                        <span className="code-text">
                                            CG{String(p.id).padStart(5, "0")}
                                        </span>
                                    ),
                                },
                                { title: "物资名称", dataIndex: "item_name" },
                                { title: "供应商", dataIndex: "supplier" },
                                {
                                    title: "数量",
                                    render: (_, p) => `${p.quantity} ${p.unit}`,
                                },
                                {
                                    title: "采购金额",
                                    render: (_, p) => (
                                        <b>{money(p.quantity * p.cost)}</b>
                                    ),
                                },
                                { title: "创建日期", dataIndex: "date" },
                                {
                                    title: "状态",
                                    dataIndex: "status",
                                    render: (v) => <Status value={v} />,
                                },
                                {
                                    title: "操作",
                                    render: (_, p) =>
                                        p.status === "待入库" ? (
                                            <Popconfirm
                                                title="确认物资已验收？"
                                                description="确认后将增加库存，并生成采购入库流水。"
                                                onConfirm={() =>
                                                    perform(
                                                        "purchase.receive",
                                                        { id: p.id },
                                                        "验收入库成功",
                                                    )
                                                }
                                            >
                                                <Button type="link">
                                                    验收入库
                                                </Button>
                                            </Popconfirm>
                                        ) : (
                                            <span className="muted">
                                                <CheckCircleOutlined /> 已完成
                                            </span>
                                        ),
                                },
                            ]}
                        />
                    </>
                )}
                {tab === "movements" && (
                    <>
                        <div className="table-toolbar">
                            <span className="muted">
                                记录每一次库存变化及对应的业务来源
                            </span>
                            <ExportButton
                                name="出入库流水"
                                rows={[
                                    [
                                        "物资",
                                        "类型",
                                        "变动数量",
                                        "结存",
                                        "来源",
                                        "时间",
                                    ],
                                    ...data.movements.map((m) => [
                                        m.name,
                                        m.type,
                                        m.quantity,
                                        m.balance,
                                        m.reference,
                                        m.created_at,
                                    ]),
                                ]}
                            />
                        </div>
                        <DataTable
                            data={data.movements}
                            columns={[
                                { title: "物资名称", dataIndex: "name" },
                                {
                                    title: "业务类型",
                                    dataIndex: "type",
                                    render: (v, r) => (
                                        <Tag
                                            variant="filled"
                                            color={
                                                r.quantity > 0
                                                    ? "green"
                                                    : "blue"
                                            }
                                        >
                                            {v}
                                        </Tag>
                                    ),
                                },
                                {
                                    title: "变动数量",
                                    dataIndex: "quantity",
                                    render: (v, r) => (
                                        <b
                                            className={
                                                v > 0 ? "green" : "amber-text"
                                            }
                                        >
                                            {v > 0 ? "+" : ""}
                                            {v} {r.unit}
                                        </b>
                                    ),
                                },
                                { title: "结存", dataIndex: "balance" },
                                { title: "业务来源", dataIndex: "reference" },
                                {
                                    title: "登记时间",
                                    dataIndex: "created_at",
                                    render: (v) =>
                                        dayjs(v).format("MM-DD HH:mm"),
                                },
                            ]}
                        />
                    </>
                )}
            </Panel>
        </>
    );
}

export function Finance() {
    const { data, openDetail, search, setSearch } = useClinic();
    const [status, setStatus] = useState("全部账单");
    const rows = data.bills.filter(
        (b) =>
            (status === "全部账单" || b.status === status) &&
            match(
                search,
                b.patient_name,
                b.phone,
                `ZD${String(b.id).padStart(5, "0")}`,
            ),
    );
    const unpaid = data.bills.filter((b) => b.status !== "已结清"),
        paidToday = data.bills.filter(
            (b) =>
                b.status === "已结清" &&
                dayjs(b.paid_at).format("YYYY-MM-DD") === data.today,
        );
    return (
        <>
            <PageTitle
                title="财务核对"
                description="顾客消费了什么、用了哪些耗材，每一笔费用都清清楚楚。"
                extra={
                    <ExportButton
                        name="顾客账单"
                        rows={[
                            [
                                "账单",
                                "姓名",
                                "日期",
                                "金额(元)",
                                "状态",
                                "支付方式",
                            ],
                            ...rows.map((b) => [
                                `ZD${b.id}`,
                                b.patient_name,
                                b.date,
                                (b.total / 100).toFixed(2),
                                b.status,
                                b.method,
                            ]),
                        ]}
                    />
                }
            />
            <div className="metrics-grid compact">
                <Metric
                    title="今日已收款"
                    value={money(sum(paidToday, (b) => b.total))}
                    icon={<AccountBookOutlined />}
                    sub={`${paidToday.length} 笔账单已结清`}
                />
                <Metric
                    title="待核对账单"
                    value={
                        data.bills.filter((b) => b.status === "待核对").length
                    }
                    unit="笔"
                    tone="amber"
                    icon={<FileTextOutlined />}
                    sub="请核实诊疗项目与耗材"
                />
                <Metric
                    title="待收款账单"
                    value={
                        data.bills.filter((b) => b.status === "待收款").length
                    }
                    unit="笔"
                    tone="blue"
                    icon={<ClockCircleOutlined />}
                    sub="已核对，等待收款"
                />
                <Metric
                    title="待处理金额"
                    value={money(sum(unpaid, (b) => b.total))}
                    tone="purple"
                    icon={<AccountBookOutlined />}
                    sub="待核对与待收款账单合计"
                />
            </div>
            <Panel>
                <div className="table-toolbar">
                    <Segmented
                        options={["全部账单", "待核对", "待收款", "已结清"]}
                        value={status}
                        onChange={setStatus}
                    />
                    <SearchBox
                        value={search}
                        onChange={setSearch}
                        placeholder="搜索顾客姓名或账单编号"
                    />
                </div>
                <DataTable
                    data={rows}
                    columns={[
                        {
                            title: "账单编号",
                            render: (_, b) => (
                                <span className="code-text">
                                    ZD{String(b.id).padStart(5, "0")}
                                </span>
                            ),
                        },
                        ...patientCols(openDetail),
                        {
                            title: "费用构成",
                            render: (_, b) => (
                                <Space size={3}>
                                    {[
                                        ...new Set(
                                            data.billLines
                                                .filter(
                                                    (l) => l.bill_id === b.id,
                                                )
                                                .map((l) => l.category),
                                        ),
                                    ].map((c) => (
                                        <Tag
                                            key={c}
                                            variant="filled"
                                            color={
                                                c === "手术耗材"
                                                    ? "cyan"
                                                    : c === "床位护理"
                                                      ? "purple"
                                                      : "default"
                                            }
                                        >
                                            {c}
                                        </Tag>
                                    ))}
                                </Space>
                            ),
                        },
                        {
                            title: "账单金额",
                            dataIndex: "total",
                            render: (v) => <b className="amount">{money(v)}</b>,
                        },
                        { title: "账单日期", dataIndex: "date" },
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
                                    onClick={() => openDetail("bill", b.id)}
                                >
                                    {b.status === "待核对"
                                        ? "核对明细"
                                        : b.status === "待收款"
                                          ? "确认收款"
                                          : "查看账单"}{" "}
                                    <ArrowRightOutlined />
                                </Button>
                            ),
                        },
                    ]}
                />
            </Panel>
            <div className="process-note">
                <CheckCircleOutlined />{" "}
                费用来源自动关联：诊疗项目、实际耗材领用、出院床位护理。新增费用后，账单将重新进入待核对状态。
            </div>
        </>
    );
}
