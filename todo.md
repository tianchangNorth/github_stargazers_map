# GitHub Stargazers Map - 项目待办事项

## 数据库设计
- [x] 设计仓库分析结果表（repositories）
- [x] 设计国家分布统计表（country_stats）
- [x] 设计 location 缓存表（location_cache）
- [x] 推送数据库迁移

## 后端功能
- [x] 实现 GitHub API 集成（获取 stargazers）
- [x] 实现 Google Maps Geocoding API 集成
- [x] 实现 location 解析为国家代码的逻辑
- [x] 实现 rate limit 保护机制
- [x] 实现缓存查询和存储逻辑
- [x] 创建 tRPC 路由用于分析仓库
- [x] 创建 tRPC 路由用于查询分析结果

## 前端功能
- [x] 设计霓虹黑色美学主题样式
- [x] 实现仓库 URL 输入表单
- [x] 集成 ECharts 世界地图可视化
- [x] 显示分析进度和状态
- [x] 显示已分析样本数和未知位置数
- [x] 实现国家分布数据展示
- [x] 添加错误处理和用户反馈

## 测试和优化
- [x] 编写后端单元测试
- [x] 测试完整分析流程
- [x] 优化大量 stargazers 的处理性能
- [x] 测试缓存和 rate limit 功能
- [x] 优化前端加载和渲染性能

## Bug 修复
- [x] 修复 ECharts 世界地图 JSON 加载失败问题

## 新问题
- [x] 诊断地图上没有显示 star 数据的原因
- [x] 修复数据处理和显示逻辑

## 用户反馈
- [x] 测试 tianchangNorth/pocket-mocker 仓库分析功能
- [x] 验证地图数据显示是否正常

## 用户新需求
- [x] 修改默认分析数量，支持分析完整的 stargazers 列表
- [x] 测试 pocket-mocker 仓库的完整 508 个 stargazers 分析

## 新发现的问题
- [x] 诊断为什么 508 个 stargazers 全部显示为 unknown locations
- [x] 检查 Google Maps Geocoding API 是否被正确调用
- [x] 验证 location 数据是否正确从 GitHub API 获取

## GitHub Token 功能
- [x] 扩展数据库 schema 添加 githubToken 字段
- [x] 实现后端 API 用于保存/获取 GitHub token
- [x] 修改 GitHub API 调用逻辑使用用户 token
- [x] 实现前端设置界面
- [x] 显示 GitHub API rate limit 状态
- [x] 测试完整功能

## 缓存问题
- [x] 清除 pocket-mocker 仓库的旧缓存数据
- [ ] 验证使用 GitHub Token 后能正确分析

## 分析卡住问题
- [x] 诊断为什么分析一直转圈不返回结果
- [x] 检查后端日志和错误信息
- [x] 修改默认分析数量为 100 个样本
- [x] 增加后端超时时间
- [x] 测试修复

## 用户新需求 - 提升分析限制
- [x] 将默认分析数量从 100 提升到 10000
- [x] 更新前端提示信息
- [x] 更新后端验证规则

## 用户体验优化
- [x] 设计 analysis_tasks 表存储分析任务状态
- [x] 实现后台任务队列处理大型仓库
- [x] 实现进度追踪机制
- [x] 实现取消分析功能
- [x] 实现前端进度条显示
- [x] 实现实时状态更新（轮询）
- [x] 测试完整流程

## Bug 修复
- [x] 修复前端轮询任务状态时的 400 错误

## 新 Bug
- [x] 修复 fullName 字段验证错误（空字符串）
