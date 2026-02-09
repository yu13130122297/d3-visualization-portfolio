import { HomeGallery } from "@/components/HomeGallery";
import { Github, Twitter, Mail } from "lucide-react";

export default function Page() {
  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className="text-primary-foreground"
              >
                <circle cx="4" cy="4" r="2" fill="currentColor" />
                <circle cx="12" cy="4" r="2" fill="currentColor" />
                <circle cx="8" cy="12" r="2" fill="currentColor" />
                <line
                  x1="4"
                  y1="4"
                  x2="12"
                  y2="4"
                  stroke="currentColor"
                  strokeWidth="1"
                />
                <line
                  x1="4"
                  y1="4"
                  x2="8"
                  y2="12"
                  stroke="currentColor"
                  strokeWidth="1"
                />
                <line
                  x1="12"
                  y1="4"
                  x2="8"
                  y2="12"
                  stroke="currentColor"
                  strokeWidth="1"
                />
              </svg>
            </div>
            <span className="font-semibold text-foreground tracking-tight">
              DataViz Studio
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="#"
              className="p-2 rounded-md text-muted-foreground hover:text-foreground transition-colors"
              aria-label="GitHub"
            >
              <Github className="w-4 h-4" />
            </a>
            <a
              href="#"
              className="p-2 rounded-md text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Twitter"
            >
              <Twitter className="w-4 h-4" />
            </a>
            <a
              href="#"
              className="p-2 rounded-md text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Email"
            >
              <Mail className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-12">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-bold tracking-tight text-foreground text-balance leading-tight">
            {"数据可视化"}
            <br />
            <span className="text-primary">{"设计作品集"}</span>
          </h1>
          <p className="mt-4 text-muted-foreground leading-relaxed text-pretty">
            {"精选的交互式数据可视化、生成艺术实验和创意编码项目合集。每件作品均采用自定义渲染引擎和精心设计的交互体验手工打造。"}
          </p>
        </div>
      </section>

      {/* Gallery */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <HomeGallery />
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between text-xs text-muted-foreground">
          <span>DataViz Studio</span>
          <span>{"基于 Next.js + Canvas 构建"}</span>
        </div>
      </footer>
    </main>
  );
}
