import matter from 'gray-matter';
import fs from 'fs/promises';
import { rimraf } from 'rimraf';

const REMOTE_DIR = './public/.remote/';
const PUBLIC_DIR = './public/';

export default class BlogParser {
  constructor(publicDir = PUBLIC_DIR, remoteDir = REMOTE_DIR) {
    this.publicDir = publicDir;
    this.remoteDir = remoteDir;

    this.publicDataList = [];
    this.remoteDataList = [];
  }

  async readFiles() {
    const [publicFiles, remoteFiles] = await Promise.all([
      this.getFilePaths(this.publicDir),
      this.getFilePaths(this.remoteDir),
    ]);

    [this.publicDataList, this.remoteDataList] = await Promise.all([
      this.extractDataList(publicFiles),
      this.extractDataList(remoteFiles),
    ]);

    const remoteIds = this.remoteDataList.map(data => data.id);
    this.publicDataList = this.publicDataList.map(data => {
      const deleted = (data.id && !remoteIds.includes(data.id)) ? true : false;

      return {...data, deleted };
    });
  }

  async getFilePaths(dir) {
    const filePaths = await fs.readdir(dir);
    return filePaths.filter(f => /.*\.md$/i.test(f)).map(f => {
      return { filePath: `${dir}${f}`, fileName: f };
    });
  }

  async extractYaml(filePathSet) {
    const fileContent = await fs.readFile(filePathSet.filePath, { encoding: 'utf8' });
    const { data } = matter(fileContent);
    return { ...data, ...filePathSet };
  }

  async extractDataList(pathList) {
    const dataList = [];
    for (const path of pathList) {
      const data = await this.extractYaml(path);
      dataList.push(data);
    }

    return dataList;
  }

  async markDeletedBlogs() {
    for (const publicData of this.publicDataList) {
      const { deleted, filePath, ignorePublish } = publicData;

      // すでにignorePublishがtrueの場合はスキップ
      if (ignorePublish) { continue; }

      if (deleted) {
        const fileContent = await fs.readFile(filePath, { encoding: 'utf8' });
        const { data, content } = matter(fileContent);

        data.ignorePublish = true;
        const updatedContent = matter.stringify(content, { ...data });

        await fs.writeFile(filePath, updatedContent, { encoding: 'utf8' });
        console.log(`Marked: ${data.title}(${filePath})`);
      }
    }
  }

  async removeDeletedBlogs() {
    for (const publicData of this.publicDataList) {
      const { deleted, filePath } = publicData;

      if (deleted) {
        await rimraf(filePath, { glob: false });
        console.log(`Deleted: ${data.title}(${filePath})`);
      }
    }
  }

}
