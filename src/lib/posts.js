import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import remarkHtml from "remark-html";

const postsDir   = path.join(process.cwd(), "content/news");
const devLogsDir = path.join(process.cwd(), "content/dev-log");

export function getAllPosts() {
  const files = fs.readdirSync(postsDir).filter(f => f.endsWith(".md"));
  return files
    .map(filename => {
      const slug = filename.replace(/\.md$/, "");
      const raw = fs.readFileSync(path.join(postsDir, filename), "utf8");
      const { data } = matter(raw);
      return { slug, ...data };
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

export async function getPostBySlug(slug) {
  const filepath = path.join(postsDir, `${slug}.md`);
  const raw = fs.readFileSync(filepath, "utf8");
  const { data, content } = matter(raw);
  const processed = await remark().use(remarkHtml).process(content);
  return { slug, ...data, contentHtml: processed.toString() };
}

export async function getAllDevLogs() {
  const files = fs.readdirSync(devLogsDir).filter(f => f.endsWith(".md"));
  return Promise.all(files.map(async filename => {
    const slug = filename.replace(/\.md$/, "");
    const raw = fs.readFileSync(path.join(devLogsDir, filename), "utf8");
    const { data } = matter(raw);
    return { slug, ...data };
  }));
}

export async function getDevLogBySlug(slug) {
  const filepath = path.join(devLogsDir, `${slug}.md`);
  const raw = fs.readFileSync(filepath, "utf8");
  const { data, content } = matter(raw);
  const processed = await remark().use(remarkHtml).process(content);
  return { slug, ...data, contentHtml: processed.toString() };
}
