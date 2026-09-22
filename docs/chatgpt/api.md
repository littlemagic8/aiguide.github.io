---
title: ChatGPT API 使用教程
order: 4
description: OpenAI API Key 申请、接口调用示例、计费方式与最佳实践。
date: 2026-09-20
tags: [chatgpt, api]
---

# ChatGPT API 使用教程

::: tip 内容建设中
本页将介绍 API Key 申请、调用示例、计费方式与最佳实践，正在整理中。
:::

## 准备工作（预览）

1. 注册 OpenAI 平台账号，进入 [platform.openai.com](https://platform.openai.com)
2. 在 API Keys 页面创建密钥（**注意保密，勿提交到代码仓库**）
3. 绑定支付方式并了解计费模式（按 token 用量计费）

## 最小调用示例（预览）

```bash
curl https://api.openai.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [
      { "role": "user", "content": "你好" }
    ]
  }'
```

::: warning 安全提醒
API Key 等同于钱包，不要硬编码在客户端代码或公开仓库中。
:::
