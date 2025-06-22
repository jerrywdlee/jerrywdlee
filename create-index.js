import 'dotenv/config';
import fs from 'fs/promises';
import { markdownTable } from 'markdown-table';

import BlogParser from './lib/blog-parser.js';
import QiitaApi from './lib/qiita-api.js';

const qiitaApi = new QiitaApi(process.env.QIITA_TOKEN);
const qiitaUser = await qiitaApi.getUser();

const blogParser = new BlogParser();

if (!qiitaUser) {
  console.error('Qiita user not found. Please check your access token.');
  process.exit(1);
}

const PUBLIC_URL_BASE = `https://qiita.com/${qiitaUser.id}/items/`;
const PRIVATE_URL_BASE = `https://qiita.com/${qiitaUser.id}/private/`;

async function createIndexInfo(maxCount = 5) {
  await blogParser.readFiles();
  const infoList = blogParser.publicDataList.sort((a, b) => {
    const dateA = a.updated_at ? new Date(a.updated_at) : new Date();
    const dateB = b.updated_at ? new Date(b.updated_at) : new Date();
    return dateB - dateA; // 降順
    // return dateA - dateB; // 昇順
  }).slice(0, maxCount);

  const tableList = [];

  tableList.push(['Title', 'Lang.', 'Updated']);

  for (const info of infoList) {
    // 各行のデータを整形
    const infoLine = [];
    const blogTitle = info.title; // TODO: 英訳にする
    const lang = '🇯🇵'; // TODO: 言語判断

    const url = info.private ? PRIVATE_URL_BASE : PUBLIC_URL_BASE;
    infoLine.push(`[${blogTitle}](${url}${info.id})`);
    infoLine.push(lang);

    if (info.updated_at) {
      infoLine.push(new Date(info.updated_at).toLocaleDateString());
    } else {
      infoLine.push('_New_');
    }

    tableList.push(infoLine);
  }

  return tableList;
}

async function createIndexMarkdown(tableList) {
  const markdown = markdownTable(tableList, {
    align: ['l', 'c', 'r'],
    rules: true,
  });

  return markdown ;
}

async function updateReadme(path = './README.md') {
  let readme = await fs.readFile(path, 'utf8');
  const lengthRegex = new RegExp(`<!-- INDEX:LEN:(\\d+) -->`);
  const matchLength = readme.match(lengthRegex);

  const length = matchLength ? parseInt(matchLength[1], 10) : 5;

  const tableList = await createIndexInfo(length);
  const markdown = await createIndexMarkdown(tableList);

  // テーブルを挿入する位置を特定
  const tableStart = readme.indexOf('<!-- INDEX:START -->');
  const tableEnd = readme.indexOf('<!-- INDEX:END -->');

  if (tableStart === -1 || tableEnd === -1) {
    throw new Error('Table markers not found in README.md');
  }

  // テーブル部分を置き換える
  readme = readme.slice(0, tableStart + '<!-- INDEX:START -->'.length) +
                  '\n' + markdown + '\n' +
                  readme.slice(tableEnd);

  // 更新された内容を書き込む
  await fs.writeFile(path, readme, 'utf8');

  console.log(`README.md updated with ${length} latest entries.`);
}

async function main() {
  try {
    await updateReadme();
  } catch (error) {
    console.error('Error updating README.md:', error);
  }
}

main().catch((error) => {
  console.error('An error occurred:', error);
  process.exit(1);
});
