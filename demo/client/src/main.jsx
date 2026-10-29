import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
} from "react";
import { createRoot } from "react-dom/client";
import {
    ConfigProvider,
    App as AntApp,
    Layout,
    Menu,
    Button,
    Avatar,
    Badge,
    Breadcrumb,
    Input,
    Drawer,
    Modal,
    Tag,
    Space,
    Spin,
    Alert,
    Tooltip,
} from "antd";
import zhCN from "antd/locale/zh_CN";
import {
    AppstoreOutlined,
    CalendarOutlined,
    TeamOutlined,
    FileTextOutlined,
    MedicineBoxOutlined,
    HomeOutlined,
    InboxOutlined,
    AccountBookOutlined,
    SearchOutlined,
    BellOutlined,
    QuestionCircleOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    ArrowRightOutlined,
    ReloadOutlined,
    SafetyCertificateOutlined,
    SettingOutlined,
    HeartFilled,
    CheckCircleFilled,
} from "@ant-design/icons";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import {
    Dashboard,
    Appointments,
    Patients,
    Records,
    Surgeries,
    Beds,
    Inventory,
    Finance,
} from "./pages.jsx";
import {
    ActionForm,
    PatientDetail,
    SurgeryDetail,
    BillDetail,
} from "./workflows.jsx";
import "./styles.css";
import "./presentation.css";
dayjs.locale("zh-cn");
import { ClinicContext } from "./context.js";
const nav = [
    ["dashboard", "工作台", AppstoreOutlined],
    ["appointments", "面诊预约", CalendarOutlined],
    ["patients", "顾客档案", TeamOutlined],
    ["records", "电子病历", FileTextOutlined],
    ["surgeries", "手术与耗材", MedicineBoxOutlined],
    ["beds", "病房床位", HomeOutlined],
    ["inventory", "库存管理", InboxOutlined],
    ["finance", "财务核对", AccountBookOutlined],
];
const pageComponents = {
    dashboard: Dashboard,
    appointments: Appointments,
    patients: Patients,
    records: Records,
    surgeries: Surgeries,
    beds: Beds,
    inventory: Inventory,
    finance: Finance,
};
function Clinic() {
    const { message } = AntApp.useApp();
    const [data, setData] = useState(null),
        [error, setError] = useState(""),
        [loading, setLoading] = useState(true);
    const [page, setPage] = useState(
            () => location.hash.slice(1) || "dashboard",
        ),
        [collapsed, setCollapsed] = useState(false),
        [form, setForm] = useState(null),
        [detail, setDetail] = useState(null),
        [search, setSearch] = useState(""),
        [globalSearch, setGlobalSearch] = useState(""),
        [panel, setPanel] = useState(null),
        [resetting, setResetting] = useState(false);
    const refresh = useCallback(async () => {
        try {
            const r = await fetch("/api/state");
            if (!r.ok) throw new Error("无法连接本地服务");
            setData(await r.json());
            setError("");
        } catch (e) {
            setError(e.message);
            throw e;
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        refresh().catch(() => {});
        const fn = () => setPage(location.hash.slice(1) || "dashboard");
        window.addEventListener("hashchange", fn);
        return () => window.removeEventListener("hashchange", fn);
    }, [refresh]);
    const navigate = (key) => {
        setPage(key);
        location.hash = key;
        setSearch("");
        setDetail(null);
    };
    const act = async (action, payload, success) => {
        const r = await fetch("/api/actions/" + action, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const result = await r.json();
        if (!r.ok) throw new Error(result.error || "操作失败");
        await refresh();
        if (success) message.success(success);
        return result;
    };
    const perform = async (action, payload, success) => {
        try {
            return await act(action, payload, success);
        } catch (e) {
            message.error(e.message);
            return null;
        }
    };
    const value = {
        data,
        refresh,
        act,
        perform,
        navigate,
        openForm: (type, values = {}) => setForm({ type, ...values }),
        openDetail: (type, id) => setDetail({ type, id }),
        search,
        setSearch,
    };
    const Page = pageComponents[page] || Dashboard;
    const label = nav.find((n) => n[0] === page)?.[1] || "工作台";
    const low = data?.inventory.filter((i) => i.stock < i.minimum) || [];
    const pending = data?.bills.filter((b) => b.status === "待核对") || [];
    return (
        <ClinicContext.Provider value={value}>
            <Layout className="app-shell">
                <Layout.Sider
                    width={224}
                    collapsedWidth={76}
                    collapsed={collapsed}
                    className="sidebar"
                    theme="light"
                    breakpoint="lg"
                    onBreakpoint={setCollapsed}
                >
                    <a className="brand" onClick={() => navigate("dashboard")}>
                        <span className="brand-symbol">
                            <span>✚</span>
                            <i />
                        </span>
                        {!collapsed && (
                            <span>
                                <strong>澄和医疗</strong>
                            </span>
                        )}
                    </a>
                    {!collapsed && (
                        <div className="clinic-selector">
                            <Avatar
                                shape="square"
                                size={32}
                                icon={<MedicineBoxOutlined />}
                            />
                            <div>
                                <b>澄和 · 中心院区</b>
                                <small>
                                    <span className="live-dot" />
                                    院内协同工作空间
                                </small>
                            </div>
                        </div>
                    )}
                    {!collapsed && (
                        <div className="nav-label">诊疗工作空间</div>
                    )}
                    <Menu
                        mode="inline"
                        selectedKeys={[page]}
                        items={nav.map(([key, label, Icon], i) => ({
                            key,
                            icon: <Icon />,
                            label: i === 4 ? <span>{label}</span> : label,
                        }))}
                        onClick={({ key }) => navigate(key)}
                    />
                    <div className="sidebar-bottom">
                        {!collapsed && (
                            <div className="care-note">
                                <HeartFilled />
                                <b>让诊疗更有温度</b>
                                <p>
                                    每一次协作，
                                    <br />
                                    都是更安心的就诊体验。
                                </p>
                            </div>
                        )}
                        <Button
                            type="text"
                            icon={<QuestionCircleOutlined />}
                            onClick={() => setPanel("guide")}
                        >
                            {!collapsed && "演示指南"}
                        </Button>
                        <Button
                            type="text"
                            icon={<SettingOutlined />}
                            onClick={() => setPanel("settings")}
                        >
                            {!collapsed && "演示设置"}
                        </Button>
                    </div>
                </Layout.Sider>
                <Layout
                    className="workspace"
                    style={{ marginLeft: collapsed ? 76 : 224 }}
                >
                    <header className="topbar">
                        <div className="topbar-left">
                            <Button
                                aria-label="收起或展开导航"
                                type="text"
                                icon={
                                    collapsed ? (
                                        <MenuUnfoldOutlined />
                                    ) : (
                                        <MenuFoldOutlined />
                                    )
                                }
                                onClick={() => setCollapsed(!collapsed)}
                            />
                            <Breadcrumb
                                items={[
                                    { title: "诊疗运营" },
                                    { title: label },
                                ]}
                            />
                        </div>
                        <div className="topbar-right">
                            <Input
                                className="global-search"
                                placeholder="搜索顾客姓名 / 手机号"
                                prefix={<SearchOutlined />}
                                value={globalSearch}
                                onChange={(e) =>
                                    setGlobalSearch(e.target.value)
                                }
                                onPressEnter={() => {
                                    navigate("patients");
                                    setSearch(globalSearch);
                                    setGlobalSearch("");
                                }}
                                suffix={<span className="key-hint">↵</span>}
                            />
                            <Tooltip title="查看待办提醒">
                                <Badge dot={low.length + pending.length > 0}>
                                    <Button
                                        aria-label="待办提醒"
                                        type="text"
                                        icon={<BellOutlined />}
                                        onClick={() =>
                                            setPanel("notifications")
                                        }
                                    />
                                </Badge>
                            </Tooltip>
                            <span className="header-divider" />
                            <Avatar className="user-avatar" size={34}>
                                陈
                            </Avatar>
                            <div className="user-name">
                                <b>陈院长</b>
                                <small>院区管理员</small>
                            </div>
                        </div>
                    </header>
                    <main className="main-content">
                        {loading ? (
                            <div className="loading-state">
                                <Spin size="large" />
                                <p>正在准备诊疗工作台…</p>
                            </div>
                        ) : error ? (
                            <Alert
                                type="error"
                                showIcon
                                title="本地服务连接失败"
                                description={error}
                                action={
                                    <Button
                                        onClick={() =>
                                            refresh().catch(() => {})
                                        }
                                    >
                                        重试
                                    </Button>
                                }
                            />
                        ) : (
                            data && <Page />
                        )}
                    </main>
                    <footer className="page-footer">
                        <span>澄和医疗 · 诊疗与运营一体化</span>
                        <span>
                            <span className="live-dot" /> 本地演示空间 <i />{" "}
                            所有顾客均为虚构演示数据
                        </span>
                    </footer>
                </Layout>
                {data && (
                    <>
                        <ActionForm
                            state={form}
                            onClose={() => setForm(null)}
                        />
                        <PatientDetail
                            id={detail?.type === "patient" ? detail.id : null}
                            onClose={() => setDetail(null)}
                        />
                        <SurgeryDetail
                            id={detail?.type === "surgery" ? detail.id : null}
                            onClose={() => setDetail(null)}
                        />
                        <BillDetail
                            id={detail?.type === "bill" ? detail.id : null}
                            onClose={() => setDetail(null)}
                        />
                    </>
                )}
                <Drawer
                    title={
                        panel === "notifications"
                            ? "工作提醒"
                            : panel === "settings"
                              ? "演示空间设置"
                              : "五分钟，体验院内协同"
                    }
                    open={!!panel}
                    onClose={() => setPanel(null)}
                    size={460}
                >
                    {panel === "notifications" && (
                        <>
                            <p className="muted">需要关注的业务事项</p>
                            <div
                                className="notification-item"
                                onClick={() => {
                                    navigate("finance");
                                    setPanel(null);
                                }}
                            >
                                <span className="notice-icon amber">
                                    <AccountBookOutlined />
                                </span>
                                <div>
                                    <b>{pending.length} 笔费用等待核对</b>
                                    <p>核对顾客诊疗项目与实际领用耗材</p>
                                </div>
                                <ArrowRightOutlined />
                            </div>
                            <div
                                className="notification-item"
                                onClick={() => {
                                    navigate("inventory");
                                    setPanel(null);
                                }}
                            >
                                <span className="notice-icon red">
                                    <InboxOutlined />
                                </span>
                                <div>
                                    <b>{low.length} 项耗材低于安全库存</b>
                                    <p>
                                        {low.map((i) => i.name).join("、") ||
                                            "当前库存充足"}
                                    </p>
                                </div>
                                <ArrowRightOutlined />
                            </div>
                        </>
                    )}
                    {panel === "guide" && (
                        <>
                            <div className="guide-intro">
                                <SafetyCertificateOutlined />
                                <h2>从预约到结算，流程自然衔接</h2>
                                <p>
                                    预置虚构顾客与业务数据，所有操作即时保存，可随时重置重新演示。
                                </p>
                            </div>
                            {[
                                [
                                    "appointments",
                                    "01",
                                    "建立面诊预约",
                                    "选择顾客、医生与时段，到院后开始接诊。",
                                ],
                                [
                                    "records",
                                    "02",
                                    "书写诊疗病历",
                                    "填写主诉、诊断与计划，保存草稿或归档。",
                                ],
                                [
                                    "surgeries",
                                    "03",
                                    "登记手术及耗材",
                                    "安排手术，登记实际用量，库存与费用同步更新。",
                                ],
                                [
                                    "beds",
                                    "04",
                                    "安排病房床位",
                                    "办理入住与出院，自动生成床位护理费用。",
                                ],
                                [
                                    "finance",
                                    "05",
                                    "核对费用并收款",
                                    "逐项核对项目与耗材，选择支付方式完成结清。",
                                ],
                            ].map(([key, n, title, desc]) => (
                                <div
                                    key={key}
                                    className="guide-step"
                                    onClick={() => {
                                        navigate(key);
                                        setPanel(null);
                                    }}
                                >
                                    <span>{n}</span>
                                    <div>
                                        <b>{title}</b>
                                        <p>{desc}</p>
                                    </div>
                                    <ArrowRightOutlined />
                                </div>
                            ))}
                        </>
                    )}
                    {panel === "settings" && (
                        <>
                            <div className="guide-intro">
                                <CheckCircleFilled />
                                <h2>本地演示空间</h2>
                                <p>
                                    数据保存在这台电脑的 SQLite
                                    文件中。关闭页面或重启服务后，数据仍会保留。
                                </p>
                            </div>
                            <div className="setting-row">
                                <span>数据保存位置</span>
                                <code>demo/data/his.sqlite</code>
                            </div>
                            <div className="setting-row">
                                <span>初始数据日期</span>
                                <b>{data?.seedDate}</b>
                            </div>
                            <div className="setting-row">
                                <span>顾客档案</span>
                                <b>{data?.patients.length} 份</b>
                            </div>
                            <Alert
                                type="info"
                                showIcon
                                title="客户演示专用"
                                description="演示版使用统一管理员身份，不包含正式多用户权限和医疗业务合规能力。请使用虚构数据进行体验。"
                            />
                            <div className="reset-section">
                                <h3>重新开始演示</h3>
                                <p className="muted">
                                    清除本演示空间的操作数据，按今天的日期重新生成示例记录。
                                </p>
                                <Button
                                    danger
                                    loading={resetting}
                                    icon={<ReloadOutlined />}
                                    onClick={() =>
                                        Modal.confirm({
                                            title: "重置全部演示数据？",
                                            content:
                                                "将删除本演示空间新增和修改的数据，并恢复虚构示例。此操作无法撤销。",
                                            okText: "确认重置",
                                            okButtonProps: { danger: true },
                                            cancelText: "取消",
                                            onOk: async () => {
                                                setResetting(true);
                                                try {
                                                    await act(
                                                        "demo.reset",
                                                        {
                                                            confirm:
                                                                "RESET_DEMO",
                                                        },
                                                        "演示数据已重置",
                                                    );
                                                } finally {
                                                    setResetting(false);
                                                }
                                            },
                                        })
                                    }
                                >
                                    重置演示数据
                                </Button>
                            </div>
                        </>
                    )}
                </Drawer>
            </Layout>
        </ClinicContext.Provider>
    );
}
const theme = {
    token: {
        colorPrimary: "#1677ff",
        colorInfo: "#1677ff",
        colorSuccess: "#22866b",
        colorWarning: "#d49a36",
        colorError: "#d66a62",
        colorText: "#1f2329",
        colorTextSecondary: "#697586",
        colorBorder: "#e3e9ed",
        colorBgLayout: "#f5f6f8",
        borderRadius: 8,
        fontSize: 14,
        fontFamily:
            '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
        controlHeight: 36,
    },
    components: {
        Menu: {
            itemHeight: 46,
            itemMarginInline: 12,
            itemBorderRadius: 7,
            itemSelectedBg: "#e6f4ff",
            itemSelectedColor: "#1677ff",
            itemColor: "#697983",
            iconSize: 18,
        },
        Table: {
            headerBg: "#f7f9fa",
            headerColor: "#667085",
            headerSplitColor: "transparent",
            rowHoverBg: "#f0f7ff",
            cellPaddingBlock: 17,
        },
        Button: { primaryShadow: "none", fontWeight: 500 },
        Card: { paddingLG: 24 },
        Tabs: { horizontalItemGutter: 28 },
        Modal: { borderRadiusLG: 14 },
    },
};
const reactRoot =
    import.meta.hot?.data.root ?? createRoot(document.getElementById("root"));
if (import.meta.hot) import.meta.hot.data.root = reactRoot;
reactRoot.render(
    <ConfigProvider locale={zhCN} theme={theme}>
        <AntApp>
            <Clinic />
        </AntApp>
    </ConfigProvider>,
);
