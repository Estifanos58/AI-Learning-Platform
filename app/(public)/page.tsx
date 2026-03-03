'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  MessageSquare, 
  Users, 
  Sparkles, 
  Zap, 
  Shield, 
  ArrowRight, 
  FileText 
} from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Background Gradients */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary/20 blur-[100px] rounded-full opacity-50" />
        <div className="absolute bottom-0 right-0 w-[800px] h-[500px] bg-blue-500/10 blur-[120px] rounded-full opacity-30" />
      </div>

      {/* Hero Section */}
      <div className="relative pt-24 pb-16 px-6 lg:pt-32 lg:pb-24">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <Badge variant="secondary" className="px-4 py-1.5 rounded-full text-sm border-primary/20 bg-primary/10 text-primary backdrop-blur-sm">
            <Sparkles className="w-4 h-4 mr-2" />
            Next Generation Learning
          </Badge>
          
          <h1 className="text-5xl lg:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/60">
            Learn Smarter with <br />
            <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">AI Intelligence</span>
          </h1>
          
          <p className="text-xl text-muted-foreground text-balance max-w-2xl mx-auto">
            Transform your documents into interactive learning experiences. 
            Real-time collaboration with AI agents and teammates in a beautifully designed workspace.
          </p>

          <div className="flex flex-wrap gap-4 justify-center items-center pt-8">
            <Button
              size="lg"
              onClick={() => router.push('/auth/signup')}
              className="h-12 px-8 text-base rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all font-semibold"
            >
              Get Started Free
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => router.push('/auth/login')}
              className="h-12 px-8 text-base rounded-full border-primary/20 hover:bg-primary/5 font-medium backdrop-blur-sm"
            >
              Sign In
            </Button>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Powered by Advanced AI</h2>
          <p className="text-muted-foreground">Everything you need to master your subjects</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: FileText,
              title: 'Document Analysis',
              desc: 'Upload PDFs and let our AI digest the content instantly.'
            },
            {
              icon: Bot,
              title: 'AI Assistant',
              desc: 'Get instant answers and summaries from your study materials.'
            },
            {
              icon: Users,
              title: 'Real-time Collaboration',
              desc: 'Study together with peers and AI agents in the same workspace.'
            },
            {
              icon: MessageSquare,
              title: 'Smart Chat',
              desc: 'Context-aware conversations that understand your documents.'
            },
            {
              icon: Zap,
              title: 'Instant Insights',
              desc: 'Generate quizzes and flashcards automatically.'
            },
            {
              icon: Shield,
              title: 'Secure & Private',
              desc: 'Your data is encrypted and protected at enterprise standards.'
            }
          ].map((feature, i) => (
            <div key={i} className="group p-6 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm hover:bg-primary/5 hover:border-primary/20 transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 text-primary group-hover:scale-110 transition-transform">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Real-time Demo Section */}
      <div className="max-w-7xl mx-auto px-6 pb-24">
        <div className="rounded-3xl border border-border/50 bg-card/30 backdrop-blur-md overflow-hidden p-8 lg:p-12 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-blue-500/5" />
          <div className="grid lg:grid-cols-2 gap-12 items-center relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-sm font-medium mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                Live Collaboration
              </div>
              <h2 className="text-4xl font-bold mb-6">Chat with AI & Humans Alike</h2>
              <p className="text-lg text-muted-foreground mb-8">
                Experience seamless communication. Switch between talking to your AI tutor and your study group members instantly without losing context.
              </p>
              <ul className="space-y-4">
                {[
                  'Real-time message syncing',
                  'AI agents present in group chats',
                  'Shared document annotations',
                  'Instant translation and summarization'
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                      <Zap className="w-3 h-3" />
                    </div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Visual Representation of Chat application */}
            <div className="bg-background rounded-xl border border-border shadow-2xl p-4">
              <div className="flex items-center gap-4 mb-4 border-b border-border pb-4">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <div className="flex-1 text-center text-sm font-medium text-muted-foreground">Study Group - Physics 101</div>
              </div>
              <div className="space-y-4 font-mono text-sm leading-relaxed">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs">AI</div>
                  <div className="bg-primary/10 p-3 rounded-lg rounded-tl-none max-w-[80%]">
                    Based on the uploaded PDF, Newton's second law states that force equals mass times acceleration (F=ma).
                  </div>
                </div>
                <div className="flex gap-3 flex-row-reverse">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500 text-xs">U</div>
                  <div className="bg-blue-500/10 p-3 rounded-lg rounded-tr-none max-w-[80%]">
                    Can you give me a real-world example of this?
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs">AI</div>
                  <div className="flex gap-1">
                     <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                     <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                     <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12 bg-card/30">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} AI Learning Platform. All rights reserved.
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms</a>
            <a href="#" className="hover:text-primary transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </main>
  );
}

