import React from "react";
import { Avatar, Button, Empty, Input, Space, Table, Tag } from "antd";
import {
    ArrowUpOutlined,
    DownloadOutlined,
    SearchOutlined,
} from "@ant-design/icons";
export const money = (value) =>
    "¥" +
    (Number(value || 0) / 100).toLocaleString("zh-CN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
export const number = (value) => Number(value || 0).toLocaleString("zh-CN");
export const statusColors = {
    待到院: "blue",
    已到院: "cyan",
    接诊中: "purple",
    已完成: "green",
    已取消: "default",
    待手术: "blue",
    进行中: "purple",
    使用中: "cyan",
    空闲: "green",
    待清洁: "orange",
    待核对: "orange",
    待收款: "blue",
    已结清: "green",
    已入库: "green",
    待入库: "orange",
    草稿: "orange",
    已归档: "green",
};
export const Status = ({ value }) => (
    <Tag className="status-tag" color={statusColors[value] || "default"}>
        <span className="status-dot" />
        {value}
    </Tag>
);
export function Person({ name, id, sub, gender, onClick }) {
    return (
        <div
            className={"person-cell" + (onClick ? " clickable" : "")}
            onClick={onClick}
        >
            <Avatar
                size={36}
                style={{
                    background: gender === "男" ? "#e4eeff" : "#eaf1ff",
                    color: gender === "男" ? "#4279ce" : "#527eda",
                }}
            >
                {name?.slice(-2)}
            </Avatar>
            <div>
                <b>{name}</b>
                <small>{sub || `CH${String(id).padStart(5, "0")}`}</small>
            </div>
        </div>
    );
}
export function PageTitle({ title, description, extra }) {
    return (
        <div className="page-heading">
            <div>
                <h1>{title}</h1>
                <p>{description}</p>
            </div>
            <Space size={10} wrap>
                {extra}
            </Space>
        </div>
    );
}
export function Panel({ title, subtitle, extra, children, className = "" }) {
    return (
        <section className={"panel " + className}>
            {title && (
                <div className="panel-heading">
                    <div>
                        <h3>{title}</h3>
                        {subtitle && <p>{subtitle}</p>}
                    </div>
                    {extra}
                </div>
            )}
            {children}
        </section>
    );
}
export function Metric({
    title,
    value,
    unit,
    icon,
    sub,
    tone = "teal",
    children,
}) {
    return (
        <div className="metric">
            <div className="metric-top">
                <span>{title}</span>
                <span className={"metric-icon " + tone}>{icon}</span>
            </div>
            <div className="metric-value">
                {value}
                <small>{unit}</small>
            </div>
            <div className="metric-sub">{sub}</div>
            {children}
        </div>
    );
}
export function DataTable({ columns, data, pageSize = 8, ...props }) {
    return (
        <Table
            rowKey="id"
            columns={columns}
            dataSource={data}
            pagination={
                data.length > pageSize
                    ? {
                          pageSize,
                          showSizeChanger: false,
                          showTotal: (total) => `共 ${total} 条记录`,
                      }
                    : false
            }
            locale={{
                emptyText: (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="暂无符合条件的记录"
                    />
                ),
            }}
            scroll={{ x: "max-content" }}
            {...props}
        />
    );
}
export function SearchBox({
    value,
    onChange,
    placeholder = "搜索姓名、手机号或编号",
}) {
    return (
        <Input
            allowClear
            value={value}
            onChange={(e) => onChange(e.target.value)}
            prefix={<SearchOutlined />}
            placeholder={placeholder}
            className="table-search"
        />
    );
}
export function csv(name, rows) {
    const esc = (v) =>
        '"' +
        String(v ?? "")
            .replace(/^[=+@-]/, "'$&")
            .replaceAll('"', '""') +
        '"';
    const text = "\uFEFF" + rows.map((r) => r.map(esc).join(",")).join("\r\n");
    const url = URL.createObjectURL(
        new Blob([text], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = name + ".csv";
    a.click();
    URL.revokeObjectURL(url);
}
export function ExportButton({ name, rows }) {
    return (
        <Button icon={<DownloadOutlined />} onClick={() => csv(name, rows)}>
            导出明细
        </Button>
    );
}
export const match = (q, ...values) =>
    !q ||
    values.some((v) =>
        String(v ?? "")
            .toLowerCase()
            .includes(q.toLowerCase()),
    );
