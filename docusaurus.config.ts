import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'Hive on MR3',
  tagline: 'Apache Hive powered by the MR3 execution engine',
  favicon: 'img/mr3.svg',

  // Set the production url of your site here
  url: 'https://mr3docs.datamonad.com',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'mr3project', // Usually your GitHub org/user name.
  projectName: 'mr3docs2', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/mr3project/mr3docs2/tree/main/',
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          // editUrl:
          //   'https://github.com/mr3project/mr3docs/tree/main/packages/create-docusaurus/templates/shared/',
          // Useful options to enforce blogging best practices
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
          blogSidebarTitle: 'All posts',
          blogSidebarCount: 'ALL',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    metadata: [
      {name: 'description', content: 'Hive on MR3 is a fast Hive and Spark SQL alternative that runs natively on Kubernetes. Learn how to deploy, configure, and operate Hive on MR3.'},
      {name: 'keywords', content: 'Hive on MR3, Hive Kubernetes, Hive on Kubernetes, Spark SQL, big data processing, MR3 execution engine'},
      {name: 'author', content: 'DataMonad'},
    ],
    image: 'img/mr3.svg',
    docs: {
      sidebar: {
        hideable: true,
      },
    },
    navbar: {
      logo: {
        alt: 'MR3docs',
        src: 'img/mr3docs.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'quickSidebar',
          position: 'left',
          label: 'Quick Start Guides',
        },
        {
          type: 'docSidebar',
          sidebarId: 'featureSidebar',
          position: 'left',
          label: 'Features',
        },
        {
          type: 'docSidebar',
          sidebarId: 'guideSidebar',
          position: 'left',
          label: 'Operations Guides',
        },
        {
          type: 'docSidebar',
          sidebarId: 'releaseSidebar',
          position: 'left',
          label: 'Release Notes',
        },
        {
          to: 'https://datamonad.com',
          position: 'right', 
          html: '<img src="/img/logo-white.svg" alt="DataMonad" height="18" style="vertical-align: middle;" />'
        },
        {to: '/blog', label: 'Blog', position: 'right'},
        {
          href: 'https://github.com/mr3project/mr3',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Quick Start Guides',
              to: '/docs/quick',
            },
            {
              label: 'Features',
              to: '/docs/features',
            },
            {
              label: 'Operations Guides',
              to: '/docs/guides',
            },
            {
              label: 'Release Notes',
              to: '/docs/releases/2.0',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Slack',
              href: 'https://join.slack.com/t/mr3-help/shared_invite/zt-1wpqztk35-AN8JRDznTkvxFIjtvhmiNg',
            },
            {
              label: 'Google Group',
              href: 'https://groups.google.com/g/hive-mr3',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'DataMonad',
              to: 'https://datamonad.com',
            },
            {
              label: 'Blog',
              to: '/blog',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/mr3project/mr3',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} DataMonad. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['yaml', 'typescript', 'diff'],
      magicComments: [
        {
          className: 'theme-code-block-highlighted-line',
          line: 'highlight-next-line',
          block: {start: 'highlight-start', end: 'highlight-end'},
        },
        {
          className: 'code-block-terminal-command',
          line: 'terminal-command',
        },
      ],
    },
  } satisfies Preset.ThemeConfig,
};

if (process.env.NODE_ENV === 'production') {
  config.plugins = config.plugins || [];
  config.plugins.push([
    '@docusaurus/plugin-google-gtag',
    {
      trackingID: 'G-QLSYT8MQJL',
      anonymizeIP: true,
    },
  ]);
}

export default config;
