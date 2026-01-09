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
