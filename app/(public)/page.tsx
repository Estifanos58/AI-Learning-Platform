'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeCustomizer } from '@/components/theme-customizer';
import { 
  Bot, 
  MessageSquare, 
  Users, 
  Sparkles, 
  Zap, 
  Shield, 
  ArrowRight, 
  FileText,
  Play,
  Github
} from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-background text-foreground overflow-hidden selection:bg-primary/20 selection:text-primary">
      
      {/* Dynamic Background */}
      <div className="fixed inset-0 -z-10 h-full w-full bg-background">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-20 blur-[100px] animate-pulse"></div>
        <div className="absolute right-0 bottom-0 -z-10 h-[400px] w-[400px] rounded-full bg-blue-500/10 opacity-30 blur-[120px]"></div>
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-xl tracking-tighter">
                <div className="bg-primary/10 p-1.5 rounded-lg text-primary">
                  <Sparkles className="w-5 h-5" />
                </div>
                <span>NotebookLM</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
                <a href="#features" className="hover:text-foreground transition-colors">Features</a>
                <a href="#demo" className="hover:text-foreground transition-colors">How it Works</a>
                <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            </div>

            <div className="flex items-center gap-4">
                 <div className="hidden sm:block">
                    <ThemeCustomizer />
                 </div>
                 <Button variant="ghost" size="sm" onClick={() => router.push('/auth/login')} className="hidden sm:flex">
                    Sign In
                 </Button>
                 <Button size="sm" onClick={() => router.push('/auth/signup')} className="rounded-full px-5 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all">
                    Get Started
                 </Button>
            </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 px-6 lg:pt-48 lg:pb-32">
        <div className="max-w-5xl mx-auto text-center space-y-8 animate-fade-in-up">
          <Badge variant="secondary" className="px-4 py-1.5 rounded-full text-sm border-primary/20 bg-primary/5 text-primary backdrop-blur-md shadow-sm hover:bg-primary/10 transition-colors cursor-default">
            <span className="relative flex h-2 w-2 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            v2.0 is now live
          </Badge>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight">
            Learn Smarter with
            <span className="block mt-2 bg-gradient-to-r from-primary via-blue-600 to-indigo-500 bg-clip-text text-transparent animate-gradient bg-300% pb-2">
               AI Intelligence
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground text-balance max-w-3xl mx-auto leading-relaxed">
            Transform your static documents into <span className="text-foreground font-semibold">interactive conversations</span>. 
            Collaborate with AI agents and peers in a workspace designed for deep learning.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
            <Button
              size="lg"
              onClick={() => router.push('/auth/signup')}
              className="h-14 px-8 text-lg rounded-full shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all font-semibold"
            >
              Start Learning Free
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            
            <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground px-4">
                <div className="flex -space-x-2">
                    {[1,2,3,4].map(i => (
                        <div key={i} className={`w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] overflow-hidden`}>
                             <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} alt="user" />
                        </div>
                    ))}
                </div>
                <div className="flex flex-col items-start leading-none gap-1">
                    <div className="flex">⭐⭐⭐⭐⭐</div>
                    <span>Loved by 10,000+ students</span>
                </div>
            </div>
          </div>
        </div>

        {/* Hero Image / floating UI */}
        <div className="mt-20 relative max-w-6xl mx-auto group perspective-1000">
             <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
             <div className="relative rounded-2xl bg-card border border-border/50 shadow-2xl overflow-hidden aspect-video md:aspect-[21/9] transform transition-transform duration-500 hover:scale-[1.01]">
                {/* Mock UI Header */}
                <div className="h-12 border-b border-border bg-muted/30 flex items-center px-4 gap-2">
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500/80" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                        <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    </div>
                    <div className="mx-auto w-1/3 h-6 bg-muted rounded-md opacity-50" />
                </div>
                {/* Mock UI Content */}
                <div className="flex h-full">
                    <div className="w-64 border-r border-border bg-muted/10 p-4 hidden md:block space-y-3">
                        <div className="h-8 w-3/4 bg-primary/20 rounded mb-6" />
                        {[1,2,3].map(i => (
                            <div key={i} className="h-10 w-full bg-muted/50 rounded flex items-center px-3 gap-3">
                                <div className="w-4 h-4 rounded bg-muted-foreground/30" />
                                <div className="h-2 w-1/2 bg-muted-foreground/20 rounded" />
                            </div>
                        ))}
                    </div>
                    <div className="flex-1 p-8 grid place-items-center bg-gradient-to-br from-background via-background to-primary/5">
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto text-primary mb-4">
                                <Bot className="w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-semibold">How can I help you learn today?</h3>
                            <div className="flex flex-wrap gap-2 justify-center max-w-lg mx-auto">
                                {["Summarize this PDF", "Create a quiz", "Explain quantum physics", "Translate to Spanish"].map(tag => (
                                    <span key={tag} className="px-3 py-1.5 rounded-full border border-border bg-background hover:border-primary/50 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
             </div>
        </div>
      </div>

      {/* Features Grid */}
      <div id="features" className="max-w-7xl mx-auto px-6 py-32">
        <div className="text-center mb-20 max-w-2xl mx-auto">
          <Badge variant="outline" className="mb-4 border-primary/20 text-primary bg-primary/5">Features</Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Powered by Advanced AI</h2>
          <p className="text-lg text-muted-foreground">Everything you need to master your subjects, from instant summaries to generated flashcards.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: FileText,
              title: 'Document Analysis',
              desc: 'Upload PDFs and let our AI digest the content instantly to extract key insights.',
              color: 'text-blue-500'
            },
            {
              icon: Bot,
              title: 'AI Assistant',
              desc: 'Get instant answers and detailed summaries from your uploaded study materials.',
              color: 'text-purple-500'
            },
            {
              icon: Users,
              title: 'Real-time Collaboration',
              desc: 'Study together with peers and specialized AI agents in the same shared workspace.',
              color: 'text-green-500'
            },
            {
              icon: MessageSquare,
              title: 'Context-Aware Chat',
              desc: 'Conversations that truly understand your documents and provide cited sources.',
              color: 'text-pink-500'
            },
            {
              icon: Zap,
              title: 'Instant Flashcards',
              desc: 'Generate quizzes and flashcards automatically to test your knowledge retention.',
              color: 'text-yellow-500'
            },
            {
              icon: Shield,
              title: 'Enterprise Security',
              desc: 'Your data is encrypted, private, and protected at the highest industry standards.',
              color: 'text-orange-500'
            }
          ].map((feature, i) => (
            <div key={i} className="group relative p-8 rounded-3xl border border-border bg-card/50 hover:bg-card hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
              <div className={`absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity ${feature.color}`}>
                  <feature.icon className="w-24 h-24 -mr-8 -mt-8 rotate-12" />
              </div>
              
              <div className={`w-14 h-14 rounded-2xl bg-background border border-border shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 ${feature.color}`}>
                <feature.icon className="w-7 h-7" />
              </div>
              
              <h3 className="text-xl font-bold mb-3 tracking-tight">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-5xl mx-auto px-6 pb-24">
         <div className="relative rounded-[2.5rem] overflow-hidden bg-primary px-6 py-20 text-center sm:px-12 lg:px-24">
             {/* Abstract Shapes */}
            <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 w-64 h-64 bg-black/10 rounded-full blur-3xl"></div>
            
            <div className="relative z-10 space-y-8">
                <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-5xl">
                    Ready to transform how you learn?
                </h2>
                <p className="mx-auto max-w-xl text-lg text-primary-foreground/80">
                    Join thousands of students and professionals using AI to master new topics faster than ever before.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <Button 
                        size="lg" 
                        variant="secondary" 
                        onClick={() => router.push('/auth/signup')}
                        className="h-14 px-8 text-lg rounded-full font-bold shadow-xl hover:scale-105 transition-transform"
                    >
                        Get Started for Free
                    </Button>
                    <Button 
                        size="lg" 
                        variant="outline" 
                        className="h-14 px-8 text-lg rounded-full border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground font-semibold"
                    >
                        View Demo
                        <Play className="ml-2 w-4 h-4 fill-current" />
                    </Button>
                </div>
            </div>
         </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-card/30 backdrop-blur-sm pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                <div className="col-span-2 md:col-span-1 space-y-4">
                    <div className="flex items-center gap-2 font-bold text-lg">
                        <div className="bg-primary/10 p-1.5 rounded-lg text-primary">
                        <Sparkles className="w-4 h-4" />
                        </div>
                        <span>NotebookLM</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Empowering learning through artificial intelligence and seamless collaboration.
                    </p>
                    <div className="flex gap-4 text-muted-foreground">
                        <Github className="w-5 h-5 hover:text-primary cursor-pointer transition-colors" />
                        <div className="w-5 h-5 bg-current mask-twitter hover:text-primary cursor-pointer transition-colors" /> 
                    </div>
                </div>
                
                <div>
                    <h4 className="font-semibold mb-4">Product</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                        <li><a href="#" className="hover:text-primary transition-colors">Features</a></li>
                        <li><a href="#" className="hover:text-primary transition-colors">Pricing</a></li>
                        <li><a href="#" className="hover:text-primary transition-colors">Integrations</a></li>
                        <li><a href="#" className="hover:text-primary transition-colors">Changelog</a></li>
                    </ul>
                </div>
                
                <div>
                    <h4 className="font-semibold mb-4">Resources</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                        <li><a href="#" className="hover:text-primary transition-colors">Documentation</a></li>
                        <li><a href="#" className="hover:text-primary transition-colors">API Reference</a></li>
                        <li><a href="#" className="hover:text-primary transition-colors">Community</a></li>
                        <li><a href="#" className="hover:text-primary transition-colors">Blog</a></li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-semibold mb-4">Legal</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                        <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
                        <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
                        <li><a href="#" className="hover:text-primary transition-colors">Cookie Policy</a></li>
                    </ul>
                </div>
            </div>
            
            <div className="border-t border-border/40 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
                <p>© {new Date().getFullYear()} AI Learning Platform. All rights reserved.</p>
                <p className="flex gap-4">
                    <span>Made with ❤️ for students</span>
                </p>
            </div>
        </div>
      </footer>
    </main>
  );
}

