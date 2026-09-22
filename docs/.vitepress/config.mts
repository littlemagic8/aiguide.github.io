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
      ['link', { rel: 'icon', type: 'image/svg+xml', href: `${BASE}logo.svg` }],
      ['meta', { name: 'theme-color', content: '#3b82f6' }],
      // ★ 站长平台所有权验证：在各平台生成验证码后，取消注释并替换 content，推送部署后再点"验证"
      // Google Search Console（https://search.google.com/search-console）
      // ['meta', { name: 'google-site-verification', content: '粘贴Google验证码' }],
      // Bing Webmaster（https://www.bing.com/webmasters）
      // ['meta', { name: 'msvalidate.01', content: '粘贴Bing验证码' }],
      // 百度搜索资源平台（https://ziyuan.baidu.com）
      // ['meta', { name: 'baidu-site-verification', content: '粘贴百度验证码' }]
    ],

    themeConfig: {
      siteTitle: 'AI 工具全教程',
      // logo 由 VitePress 自动拼接 base，不要手写 BASE 前缀（head 里的 favicon 才需要）
      logo: '/logo.svg',

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
            // OpenAI 花结标志，内联 style 固定金色（主题 CSS 的 fill:currentColor 会覆盖 svg 属性填色）
            svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="fill:#E8A33D"><path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/></svg>'
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
