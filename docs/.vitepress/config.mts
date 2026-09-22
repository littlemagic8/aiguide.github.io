import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = '/aiguide.github.io/'
const SITE = 'https://littlemagic8.github.io'

// ================= 自动侧边栏 =================
// 约定：docs/ 下每个子目录即一个专题；目录/文章的显示文字取 frontmatter 的 title；
// 排序取 frontmatter 的 order（数字越小越靠前，缺省按名称排）；sidebar: false 可隐藏。
const DOCS_ROOT = fileURLToPath(new URL('../', import.meta.url))
const IGNORE_DIRS = new Set(['.vitepress', 'public', 'node_modules', 'dist', 'images'])

function readFrontmatter(absPath: string): { title?: string; order?: number; hidden?: boolean } {
  const fm: { title?: string; order?: number; hidden?: boolean } = {}
  try {
    const m = readFileSync(absPath, 'utf-8').match(/^---\r?\n([\s\S]*?)\r?\n---/)
    if (!m) return fm
    const title = m[1].match(/^title:\s*(.+)\s*$/m)?.[1]
    if (title) fm.title = title.replace(/^["']|["']$/g, '').trim()
    const order = m[1].match(/^order:\s*(\d+)\s*$/m)?.[1]
    if (order) fm.order = Number(order)
    if (/^sidebar:\s*false\s*$/m.test(m[1])) fm.hidden = true
  } catch {
    /* 无 frontmatter 时忽略 */
  }
  return fm
}

const prettify = (name: string) =>
  name.replace(/\.md$/, '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

interface SideItem {
  text: string
  link?: string
  items?: SideItem[]
  collapsed?: boolean
}

function scanEntries(relDir: string): SideItem[] {
  const absDir = join(DOCS_ROOT, relDir)
  const items: (SideItem & { _order: number })[] = []
  for (const name of readdirSync(absDir)) {
    if (name.startsWith('.') || name === 'index.md' || IGNORE_DIRS.has(name)) continue
    const childRel = `${relDir}/${name}`
    const absChild = join(absDir, name)
    if (statSync(absChild).isDirectory()) {
      const idx = readFrontmatter(join(absChild, 'index.md'))
      if (idx.hidden) continue
      const group: SideItem = { text: idx.title ?? prettify(name), items: [], collapsed: false }
      if (existsSync(join(absChild, 'index.md')))
        group.items!.push({ text: '总览', link: `/${childRel}/` })
      group.items!.push(...scanEntries(childRel))
      items.push({ ...group, _order: idx.order ?? Number.MAX_SAFE_INTEGER })
    } else if (name.endsWith('.md')) {
      const fm = readFrontmatter(absChild)
      if (fm.hidden) continue
      items.push({
        text: fm.title ?? prettify(name),
        link: `/${childRel.replace(/\.md$/, '')}`,
        _order: fm.order ?? Number.MAX_SAFE_INTEGER
      })
    }
  }
  return items
    .sort((a, b) => a._order - b._order || a.text.localeCompare(b.text, 'zh'))
    .map(({ _order, ...it }) => it)
}

function buildSidebars(): Record<string, SideItem[]> {
  const sidebars: Record<string, SideItem[]> = {}
  for (const name of readdirSync(DOCS_ROOT)) {
    const abs = join(DOCS_ROOT, name)
    if (!statSync(abs).isDirectory()) continue
    if (name.startsWith('.') || IGNORE_DIRS.has(name)) continue
    const idx = readFrontmatter(join(abs, 'index.md'))
    if (idx.hidden) continue
    const section: SideItem = { text: idx.title ?? prettify(name), items: [] }
    if (existsSync(join(abs, 'index.md')))
      section.items!.push({ text: '总览', link: `/${name}/` })
    section.items!.push(...scanEntries(name))
    sidebars[`/${name}/`] = [section]
  }
  return sidebars
}
// ==============================================

export default withMermaid(
  defineConfig({
    lang: 'zh-CN',
    title: 'AI 工具全教程',
    description: 'ChatGPT、Grok、Gemini、Claude、X 等 AI 工具完整使用教程',

    // ★ 关键：项目站点必须带仓库名路径，否则资源 404（见 design.md §2.1）
    base: BASE,
    cleanUrls: true,
    lastUpdated: true,

    // sitemap.xml：注意 VitePress 不会自动拼接 base，hostname 必须包含 base 路径
    sitemap: {
      hostname: SITE + BASE
    },

    head: [
      // head 中的资源不会自动加 base 前缀，必须手写完整路径
      ['link', { rel: 'icon', href: `${BASE}favicon.ico` }],
      ['meta', { name: 'theme-color', content: '#3b82f6' }]
    ],

    themeConfig: {
      siteTitle: 'AI 工具全教程',
      // logo: `${BASE}logo.svg`,   // 待提供 logo 后启用（request.md Q5）

      nav: [
        { text: '首页', link: '/' },
        { text: 'ChatGPT', link: '/chatgpt/' },
        { text: 'Grok', link: '/grok/' },
        { text: 'Gemini', link: '/gemini/' },
        { text: 'Claude', link: '/claude/' },
        { text: 'X', link: '/x/' },
        { text: '对比选型', link: '/comparison/' },
        { text: '关于', link: '/about' }
      ],

      // 自动扫描 docs/ 目录生成，新增文章无需修改此文件
      sidebar: buildSidebars(),

      socialLinks: [
        {
          icon: {
            svg: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>'
          },
          link: 'https://littlemagic8.github.io/gptplus/index.html',
          ariaLabel: 'AI 服务充值中心'
        }
      ],

      footer: {
        message: '本站提供 AI 工具教程与充值指南 · 内容仅供学习参考 · <a href="https://littlemagic8.github.io/gptplus/index.html" target="_blank" rel="noopener">AI 服务充值中心</a>',
        copyright: 'Copyright © 2026 littlemagic8'
      },

      search: {
        provider: 'local',
        options: {
          translations: {
            button: { buttonText: '搜索文档', buttonAriaLabel: '搜索文档' },
            modal: {
              noResultsText: '未找到相关结果',
              resetButtonTitle: '清除查询条件',
              footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' }
            }
          }
        }
      },

      outline: {
        level: [2, 3],
        label: '本页目录'
      },

      lastUpdated: {
        text: '最后更新于',
        formatOptions: {
          dateStyle: 'short',
          timeStyle: 'medium'
        }
      },

      docFooter: { prev: '上一篇', next: '下一篇' },
      darkModeSwitchLabel: '外观',
      lightModeSwitchTitle: '切换到浅色模式',
      darkModeSwitchTitle: '切换到深色模式',
      sidebarMenuLabel: '菜单',
      returnToTopLabel: '返回顶部'
    },

    markdown: {
      lineNumbers: true,
      image: { lazyLoading: true }
    },

    // 修复 dev 白屏：mermaid 的依赖 fastdom 是 UMD 格式，
    // 不预打包会导致 "does not provide an export named 'default'" 报错
    vite: {
      optimizeDeps: {
        include: ['mermaid', 'fastdom']
      },
      // 图片按独立文件产出（默认小 SVG 会被内联成 base64，无法作为图片 URL 被浏览/收录）
      build: {
        assetsInlineLimit: 0
      }
    }
  })
)
