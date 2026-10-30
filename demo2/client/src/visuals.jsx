import React, { useId, useState } from "react";
import { Avatar, Button, Progress, Tag } from "antd";
import {
    ArrowRightOutlined,
    CalendarOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    HomeOutlined,
    MedicineBoxOutlined,
    TeamOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { Panel, Status } from "./shared.jsx";

export function AreaChart({ data, label = "预约人数" }) {
    const id = useId().replaceAll(":", "");
    const [active, setActive] = useState(null);
    const max = Math.max(
        4,
        Math.ceil(Math.max(...data.map((d) => d.count), 0) / 4) * 4,
    );
    const w = 660,
        h = 238,
        left = 42,
        right = 24,
        top = 26,
        bottom = 37,
        plotW = w - left - right,
        plotH = h - top - bottom;
    const pts = data.map((d, i) => ({
        x: left + (i * plotW) / Math.max(1, data.length - 1),
        y: top + plotH - (d.count / max) * plotH,
        ...d,
    }));
    let path = `M${pts[0]?.x || left},${pts[0]?.y || top + plotH}`;
    for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1],
            b = pts[i];
        path += ` C${a.x + (b.x - a.x) * 0.48},${a.y} ${b.x - (b.x - a.x) * 0.48},${b.y} ${b.x},${b.y}`;
    }
    const focus = pts[active ?? Math.max(0, pts.length - 2)];
    return (
        <svg
            className="medical-area-chart"
            viewBox={`0 0 ${w} ${h}`}
            role="img"
            aria-label={`${label}趋势，${data.map((d) => `${d.date} ${d.count}人`).join("，")}`}
        >
            <defs>
                <linearGradient id={`fill${id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#287dff" stopOpacity=".42" />
                    <stop
                        offset="100%"
                        stopColor="#70b1ff"
                        stopOpacity=".06"
                    />
                </linearGradient>
                <filter id={`shadow${id}`}>
                    <feDropShadow
                        dx="0"
                        dy="3"
                        stdDeviation="4"
                        floodColor="#1677ff"
                        floodOpacity=".25"
                    />
                </filter>
            </defs>
            {[0, 1, 2, 3, 4].map((i) => (
                <g key={i}>
                    <line
                        x1={left}
                        y1={top + (i * plotH) / 4}
                        x2={w - right}
                        y2={top + (i * plotH) / 4}
                        stroke="#dfeafb"
                        strokeDasharray="3 4"
                    />
                    <text
                        x={left - 14}
                        y={top + (i * plotH) / 4 + 4}
                        fill="#595959"
                        textAnchor="end"
                        fontSize="10"
                    >
                        {max - (max * i) / 4}
                    </text>
                </g>
            ))}
            <path
                d={`${path} L${pts.at(-1)?.x || left},${top + plotH} L${left},${top + plotH} Z`}
                fill={`url(#fill${id})`}
            />
            <path
                className="chart-line"
                d={path}
                fill="none"
                stroke="#2377ff"
                strokeWidth="3"
            />
            {pts
                .filter(
                    (d, i) =>
                        data.length <= 7 ||
                        i % Math.ceil(data.length / 7) === 0 ||
                        i === data.length - 1,
                )
                .map((d) => (
                    <text
                        key={d.date}
                        x={d.x}
                        y={h - 11}
                        textAnchor="middle"
                        fill="#595959"
                        fontSize="10"
                    >
                        {dayjs(d.date).format("MM/DD")}
                    </text>
                ))}
            {focus && (
                <g>
                    <line
                        x1={focus.x}
                        x2={focus.x}
                        y1={top}
                        y2={top + plotH}
                        stroke="#9cc4ff"
                        strokeDasharray="4 4"
                    />
                    <rect
                        x={Math.min(
                            w - right - 60,
                            Math.max(left, focus.x - 30),
                        )}
                        y={Math.max(2, focus.y - 51)}
                        width="60"
                        height="39"
                        rx="6"
                        fill="#287bff"
                        filter={`url(#shadow${id})`}
                    />
                    <text
                        x={Math.min(
                            w - right - 30,
                            Math.max(left + 30, focus.x),
                        )}
                        y={Math.max(2, focus.y - 51) + 15}
                        fontSize="9"
                        fill="#dcecff"
                        textAnchor="middle"
                    >
                        {dayjs(focus.date).format("MM/DD")}
                    </text>
                    <text
                        x={Math.min(
                            w - right - 30,
                            Math.max(left + 30, focus.x),
                        )}
                        y={Math.max(2, focus.y - 51) + 30}
                        fontSize="12"
                        fontWeight="600"
                        fill="white"
                        textAnchor="middle"
                    >
                        {focus.count} 人
                    </text>
                </g>
            )}
            {pts.map((d, i) => (
                <g
                    key={d.date}
                    tabIndex={0}
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    aria-label={`${d.date}，${d.count}人`}
                >
                    <circle
                        cx={d.x}
                        cy={d.y}
                        r={active === i ? 5 : 3}
                        fill="white"
                        stroke="#2377ff"
                        strokeWidth="2"
                    />
                    <circle cx={d.x} cy={d.y} r="12" fill="transparent" />
                </g>
            ))}
        </svg>
    );
}
export function OccupancyChart({ beds, compact = false }) {
    const used = beds.filter((b) => b.status === "使用中").length,
        free = beds.filter((b) => b.status === "空闲").length,
        clean = beds.length - used - free,
        pct = beds.length ? Math.round((used / beds.length) * 100) : 0;
    return (
        <div
            className={"occupancy-content " + (compact ? "compact-donut" : "")}
        >
            <div className="donut-stage">
                <svg
                    viewBox="0 0 180 180"
                    role="img"
                    aria-label={`床位使用率 ${pct}%`}
                >
                    <defs>
                        <linearGradient
                            id={compact ? "ringSmall" : "ringLarge"}
                            x1="0"
                            y1="0"
                            x2="1"
                            y2="1"
                        >
                            <stop stopColor="#1765ff" />
                            <stop offset="1" stopColor="#4d9cff" />
                        </linearGradient>
                    </defs>
                    <circle
                        cx="90"
                        cy="90"
                        r="67"
                        fill="none"
                        stroke="#f2c77d"
                        strokeWidth="19"
                    />
                    <circle
                        cx="90"
                        cy="90"
                        r="67"
                        fill="none"
                        stroke="#77b1ff"
                        strokeWidth="19"
                        strokeDasharray={`${((beds.length - clean) / Math.max(1, beds.length)) * 421} 421`}
                        transform="rotate(-90 90 90)"
                    />
                    <circle
                        className="ring-progress"
                        cx="90"
                        cy="90"
                        r="67"
                        fill="none"
                        stroke={`url(#${compact ? "ringSmall" : "ringLarge"})`}
                        strokeWidth="19"
                        strokeDasharray={`${(used / Math.max(1, beds.length)) * 421} 421`}
                        transform="rotate(-90 90 90)"
                    />
                    <text
                        x="90"
                        y="89"
                        textAnchor="middle"
                        fontSize="30"
                        fontWeight="650"
                        fill="#141414"
                    >
                        {pct}%
                    </text>
                    <text
                        x="90"
                        y="112"
                        textAnchor="middle"
                        fontSize="11"
                        fill="#595959"
                    >
                        床位使用率
                    </text>
                </svg>
            </div>
            <div className="donut-legend">
                {[
                    ["使用中", used, "#2265f5"],
                    ["可入住", free, "#77b1ff"],
                    ["待清洁", clean, "#f2c77d"],
                ].map(([t, n, c]) => (
                    <div key={t}>
                        <span>
                            <i style={{ background: c }} />
                            {t}
                        </span>
                        <b>
                            {n}
                            <small> 床</small>
                        </b>
                    </div>
                ))}
                <div className="legend-total">
                    <span>总床位</span>
                    <b>{beds.length}</b>
                </div>
            </div>
        </div>
    );
}
export function DepartmentChart({ data }) {
    const max = Math.max(1, ...data.map((d) => d.count));
    return (
        <div className="department-chart">
            {data.map((d, i) => (
                <div key={d.name} className="department-bar">
                    <span className="bar-number">{d.count}</span>
                    <div className="bar-track">
                        <div
                            className="bar-fill"
                            style={{
                                height: `${Math.max(d.count ? 10 : 0, (d.count / max) * 100)}%`,
                                animationDelay: `${i * 0.08}s`,
                            }}
                        />
                    </div>
                    <span className="bar-label">{d.name}</span>
                </div>
            ))}
        </div>
    );
}
export function AppointmentCalendar({ date, setDate, appointments }) {
    const week = Array.from({ length: 7 }, (_, i) =>
        dayjs(date).startOf("week").add(i, "day").format("YYYY-MM-DD"),
    );
    const rows = appointments.filter(
        (a) => a.date === date && a.status !== "已取消",
    );
    return (
        <Panel
            title="预约日历"
            extra={<CalendarOutlined style={{ color: "#7aa7ed" }} />}
            className="appointment-calendar"
        >
            <div className="calendar-month">
                <b>{dayjs(date).format("YYYY 年 M 月")}</b>
                <span>{dayjs(date).format("dddd")}</span>
            </div>
            <div className="week-days">
                {week.map((d) => (
                    <button
                        key={d}
                        onClick={() => setDate(d)}
                        className={d === date ? "active" : ""}
                    >
                        <small>{dayjs(d).format("dd")}</small>
                        <b>{dayjs(d).format("D")}</b>
                        <i
                            className={
                                appointments.some((a) => a.date === d)
                                    ? "has-visits"
                                    : ""
                            }
                        />
                    </button>
                ))}
            </div>
            <div className="calendar-detail-head">
                <b>当日时段分布</b>
                <small>{rows.length} 人预约</small>
            </div>
            <div className="time-distribution">
                {[
                    [8, 10],
                    [10, 12],
                    [12, 15],
                    [15, 19],
                ].map(([start, end]) => {
                    const n = rows.filter(
                        (a) =>
                            Number(a.time.slice(0, 2)) >= start &&
                            Number(a.time.slice(0, 2)) < end,
                    ).length;
                    return (
                        <div key={start}>
                            <span>
                                {String(start).padStart(2, "0")}:00 – {end}:00
                            </span>
                            <Progress
                                percent={(n / Math.max(1, rows.length)) * 100}
                                showInfo={false}
                                strokeColor={{
                                    "0%": "#65a9ff",
                                    "100%": "#2377ff",
                                }}
                                size="small"
                            />
                            <b>{n} 人</b>
                        </div>
                    );
                })}
            </div>
            <div className="calendar-bottom">
                <CheckCircleOutlined /> 预约时段与医生安排实时同步
            </div>
        </Panel>
    );
}
export function SurgeryRooms({ surgeries, onSelect }) {
    return (
        <div className="surgery-room-grid">
            {["手术室 A", "手术室 B", "治疗室 C"].map((room, i) => {
                const ops = surgeries.filter((s) => s.room === room),
                    active = ops.find((s) => s.status === "进行中"),
                    next =
                        active ||
                        ops.find((s) => s.status === "待手术") ||
                        ops[0];
                return (
                    <button
                        className={
                            "surgery-room " + (active ? "room-active" : "")
                        }
                        key={room}
                        onClick={() => next && onSelect(next.id)}
                        disabled={!next}
                    >
                        <span className="room-symbol">
                            <MedicineBoxOutlined />
                        </span>
                        <div className="room-info">
                            <h3>
                                {room}
                                <Tag
                                    color={active ? "blue" : "default"}
                                    variant="filled"
                                >
                                    {active
                                        ? "手术进行中"
                                        : ops.some((s) => s.status === "待手术")
                                          ? "有手术安排"
                                          : "空闲"}
                                </Tag>
                            </h3>
                            <p>
                                {next
                                    ? `${next.time} · ${next.patient_name} · ${next.project}`
                                    : "当前时段暂无手术安排"}
                            </p>
                        </div>
                        <ArrowRightOutlined />
                    </button>
                );
            })}
        </div>
    );
}
