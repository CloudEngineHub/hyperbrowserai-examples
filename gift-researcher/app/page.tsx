"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Gift, Sparkles, Loader2, ExternalLink, Search, Menu } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import confetti from "canvas-confetti"

import { InteractiveSnowfall } from "@/components/ui/interactive-snowfall"
import { ChristmasLights } from "@/components/ui/christmas-lights"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const formSchema = z.object({
  recipient: z.string().min(2, "Who is this for?"),
  age: z.string().optional(),
  interests: z.string().min(3, "What are their interests?"),
  vibe: z.string().optional(),
  budget: z.string().min(1, "What is your budget?"),
})

interface GiftRecommendation {
  name: string
  description: string
  price: string
  url: string
  image?: string
  reason: string
}

export default function Home() {
  const [results, setResults] = useState<GiftRecommendation[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState("Researching...")

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      recipient: "",
      age: "",
      interests: "",
      vibe: "",
      budget: "",
    },
  })

  const loadingMessages = [
    "Scanning web discussions...",
    "Analyzing gift guides...",
    "Reading product reviews...",
    "Finding hidden gems...",
    "Comparing options...",
  ]

  useEffect(() => {
    if (loading) {
      let index = 0
      const interval = setInterval(() => {
        index = (index + 1) % loadingMessages.length
        setLoadingMessage(loadingMessages[index])
      }, 2500)
      return () => clearInterval(interval)
    }
  }, [loading])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true)
    setResults([])
    
    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })

      if (!response.ok) throw new Error("Failed to fetch ideas")

      const data = await response.json()
      setResults(data.recommendations)
      
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#ffffff', '#cccccc', '#999999'],
        disableForReducedMotion: true
      })
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#0f0f12] text-[#f1f1f1] relative selection:bg-[#ff595e] selection:text-[#f1f1f1] flex flex-col font-sans">
      <ChristmasLights />
      <InteractiveSnowfall />
      
      {/* Background Gradients - Warmer */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
         {/* Warm hearth glow at bottom */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[radial-gradient(ellipse_at_center,rgba(255,100,0,0.08),transparent_70%)]"></div>
         {/* Subtle red tint overall */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(20,0,0,0.4),transparent_100%)] mix-blend-overlay"></div>
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#0f0f12]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/hyperbrowser_symbol-light.svg" 
              alt="Deep Gift Research Logo" 
              className="w-8 h-8 invert"
            />
            <span className="font-bold text-lg tracking-tight text-[#f1f1f1]">Deep Gift Research</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-base font-semibold text-gray-400">
             <a href="https://hyperbrowser.ai" target="_blank" className="hover:text-white transition-colors">Powered by Hyperbrowser</a>
          </div>
          <div className="md:hidden">
            <Menu className="w-6 h-6 text-gray-400" />
          </div>
        </div>
      </nav>

      <div className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        
        {/* Hero Text */}
        <div className="text-center mb-8 space-y-3">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tighter text-[#f1f1f1]">
            Find the perfect gift.
          </h1>
          <p className="text-lg sm:text-xl text-gray-400 font-medium max-w-2xl mx-auto leading-relaxed">
            AI-powered research backed by real discussions.
          </p>
        </div>

        {/* Main Form */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="border border-white/10 shadow-2xl shadow-black/40 bg-black/40 backdrop-blur-md ring-1 ring-white/10 overflow-hidden rounded-2xl">
            <CardHeader className="bg-transparent border-b border-white/5 py-6 px-8">
              <CardTitle className="flex items-center gap-3 text-xl font-semibold text-[#f1f1f1]">
                <Sparkles className="w-5 h-5 text-gray-400" />
                Tell us about the recipient
              </CardTitle>
            </CardHeader>
            
            <CardContent className="p-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <FormField
                      control={form.control}
                      name="recipient"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-lg font-semibold text-gray-200">Who is this for?</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g. My dad, Best friend" 
                              className="h-14 text-lg px-4 bg-[#2A2A30] border-transparent text-[#f1f1f1] placeholder:text-gray-500 focus:bg-[#383840] focus:border-white/20 focus:ring-white/10 transition-all"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage className="text-red-400" />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="age"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-lg font-semibold text-gray-200">Age (Approx)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g. 55" 
                              className="h-14 text-lg px-4 bg-[#2A2A30] border-transparent text-[#f1f1f1] placeholder:text-gray-500 focus:bg-[#383840] focus:border-white/20 focus:ring-white/10 transition-all"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage className="text-red-400" />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="interests"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-lg font-semibold text-gray-200">Interests & Hobbies</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="e.g. Woodworking, specialty coffee, hates modern technology, loves history books" 
                            className="min-h-[140px] text-lg p-4 bg-[#2A2A30] border-transparent text-[#f1f1f1] placeholder:text-gray-500 focus:bg-[#383840] focus:border-white/20 focus:ring-white/10 transition-all resize-none leading-relaxed"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <FormField
                      control={form.control}
                      name="vibe"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-lg font-semibold text-gray-200">Vibe</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g. Practical, sentimental, fun" 
                              className="h-14 text-lg px-4 bg-[#2A2A30] border-transparent text-[#f1f1f1] placeholder:text-gray-500 focus:bg-[#383840] focus:border-white/20 focus:ring-white/10 transition-all"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage className="text-red-400" />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="budget"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-lg font-semibold text-gray-200">Budget</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g. $50-100" 
                              className="h-14 text-lg px-4 bg-[#2A2A30] border-transparent text-[#f1f1f1] placeholder:text-gray-500 focus:bg-[#383840] focus:border-white/20 focus:ring-white/10 transition-all"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage className="text-red-400" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="pt-4">
                    <Button 
                      type="submit" 
                      size="lg" 
                      className="w-full h-16 text-xl font-bold bg-[#f1f1f1] hover:bg-white text-[#1A1A1F] rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-[0.99]" 
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                          {loadingMessage}
                        </>
                      ) : (
                        <>
                          <Search className="mr-3 h-6 w-6" />
                          Find Perfect Gifts
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Loading State */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mt-12"
            >
              <div className="bg-[#222227]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center shadow-2xl">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="inline-block mb-6"
                >
                  <Sparkles className="w-12 h-12 text-gray-300" />
                </motion.div>
                <h3 className="text-2xl font-bold text-[#f1f1f1] mb-2">{loadingMessage}</h3>
                <p className="text-gray-400 text-lg">Scouring the deep web for the best matches...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {results.length > 0 && !loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="mt-16 space-y-10"
            >
              <div className="flex items-center gap-4">
                <div className="h-px bg-white/10 flex-1"></div>
                <span className="text-gray-500 font-bold text-sm uppercase tracking-widest">
                  Top Recommendations
                </span>
                <div className="h-px bg-white/10 flex-1"></div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                {results.map((gift, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="overflow-hidden hover:shadow-2xl hover:shadow-black/40 transition-all duration-300 border-0 ring-1 ring-white/10 hover:ring-white/20 group bg-black/40 backdrop-blur-md rounded-2xl">
                      <div className="flex flex-col h-full p-6 sm:p-8">
                        {/* Header with Badge and Price */}
                        <div className="flex items-start justify-between gap-4 mb-6">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center border border-purple-500/20 shrink-0">
                              <Gift className="w-6 h-6 text-purple-300" />
                            </div>
                            <div className="px-3 py-1.5 bg-black/40 backdrop-blur-sm rounded-full border border-white/20">
                              <span className="text-xs font-bold text-white uppercase tracking-wider">
                                Match #{index + 1}
                              </span>
                            </div>
                          </div>
                          <div className="px-4 py-2 bg-[#f1f1f1] rounded-lg shadow-lg shrink-0">
                            <span className="text-lg font-bold text-[#1A1A1F]">{gift.price}</span>
                          </div>
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 space-y-6">
                          <div>
                            <h3 className="text-2xl sm:text-3xl font-bold text-[#f1f1f1] group-hover:text-white transition-colors mb-3 leading-tight">
                              {gift.name}
                            </h3>
                            <p className="text-base sm:text-lg text-gray-300 leading-relaxed">
                              {gift.description}
                            </p>
                          </div>
                          
                          {/* Why it's a match - Enhanced */}
                          <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent rounded-xl"></div>
                            <div className="relative bg-[#2A2A30]/50 backdrop-blur-sm rounded-xl p-5 border border-white/5">
                              <div className="flex gap-3">
                                <div className="shrink-0 mt-0.5">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center border border-purple-500/20">
                                    <Sparkles className="w-4 h-4 text-purple-300" />
                                  </div>
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-purple-200 mb-1.5 uppercase tracking-wide">
                                    Perfect Match
                                  </p>
                                  <p className="text-gray-300 leading-relaxed">
                                    {gift.reason}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* CTA Button - Enhanced */}
                        <div className="pt-6">
                          <Button 
                            size="lg" 
                            className="w-full h-14 text-lg font-bold bg-gradient-to-r from-[#f1f1f1] to-white hover:from-white hover:to-[#f1f1f1] text-[#1A1A1F] rounded-xl shadow-lg hover:shadow-2xl transition-all active:scale-[0.98] group/btn" 
                            asChild
                          >
                            <a href={gift.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3">
                              <Search className="w-5 h-5" />
                              View on Store
                              <ExternalLink className="w-5 h-5 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Footer */}
        <footer className="mt-24 border-t border-white/10 pt-12 pb-12 text-center">
            <p className="text-gray-500 font-medium">
              Powered by <a href="https://hyperbrowser.ai" className="text-[#f1f1f1] font-bold hover:underline">Hyperbrowser</a>
            </p>
        </footer>
      </div>
    </main>
  )
}
