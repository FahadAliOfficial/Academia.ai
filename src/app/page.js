'use client'

import { useState } from 'react';

export default function Home() {
  <time datetime="2016-10-25" suppressHydrationWarning />
  
  return (
    <main className="font-sans bg-[#F9FAFB] text-[#1F2937]">
      {/* ✅ Navbar */}
      <header className="fixed top-0 left-0 w-full bg-[#4F46E5] text-white shadow-md z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-2xl font-bold">EduSphere</h1>
          <nav className="hidden md:flex space-x-6 font-medium">
            <a href="#home" className="hover:underline">Home</a>
            <a href="#features" className="hover:underline">Features</a>
            <a href="#testimonials" className="hover:underline">Testimonials</a>
            <a href="#contact" className="hover:underline">Contact</a>
          </nav>
        </div>
      </header>

      {/* ✅ Hero Section */}
      <section id="home" className="pt-28 min-h-screen flex flex-col items-center justify-center text-center px-4">
        <h2 className="text-5xl font-bold mb-4">Welcome to EduSphere</h2>
        <p className="text-lg text-[#6B7280] max-w-xl mx-auto">
          A complete e-learning platform empowering students and teachers to connect, learn, and grow.
        </p>
        <div className="mt-6">
          <a
            href="/login"
            className="bg-[#4F46E5] hover:bg-[#0EA5E9] text-white px-6 py-2 rounded-md mr-4 transition-colors"
          >
            Login
          </a>
          <a
            href="/register"
            className="bg-white text-[#1F2937] border border-[#E5E7EB] px-6 py-2 rounded-md hover:bg-gray-100"
          >
            Register
          </a>
        </div>
      </section>

      {/* ✅ Features Section */}
      <section id="features" className="py-20">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h3 className="text-3xl font-semibold mb-8">Core Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            {[
              '✔️ Role-based Authentication (Student/Teacher)',
              '✔️ Course Creation, Enrollment & Management',
              '✔️ Share Study Materials (PDFs, Videos, Links)',
              '✔️ Submit & Grade Assignments',
              '✔️ Personalized Dashboards',
              '✔️ Live Classes & Chat',
              '✔️ AI-Powered Q&A Chatbot'
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl shadow-md p-5 text-[#1F2937]"
              >
                {feature}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ✅ Testimonials Section */}
      <section id="testimonials" className="py-20 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-3xl font-semibold mb-8">What People Say</h3>
          <blockquote className="italic text-[#6B7280] mb-4">
            "EduSphere made online teaching effortless!" – <strong>A Teacher</strong>
          </blockquote>
          <blockquote className="italic text-[#6B7280]">
            "Assignments, chats, and materials all in one place." – <strong>A Student</strong>
          </blockquote>
        </div>
      </section>

      {/* ✅ Contact Section */}
      <section id="contact" className="py-20 bg-[#F9FAFB]">
        <div className="max-w-xl mx-auto text-center">
          <h3 className="text-3xl font-semibold mb-6">Contact Us</h3>
          <p className="text-[#6B7280] mb-4">Have questions or feedback? Reach out!</p>
          <a href="mailto:support@edusphere.com" className="text-[#0EA5E9] underline">
            support@edusphere.com
          </a>
        </div>
      </section>

      {/* ✅ Footer */}
      <footer className="py-6 text-center text-sm text-[#6B7280] border-t border-[#E5E7EB]">
        © 2025 EduSphere. Built by Fahad Ali.
      </footer>
    </main>
  );
}
