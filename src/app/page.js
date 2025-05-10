"use client";
import { useState, useRef } from "react";
import { Star, Quote,ChevronLeft, ChevronRight } from "lucide-react";

export default function Home() {
   const [scrollIndex, setScrollIndex] = useState(0);
  const cardWidth = 320;
  const containerRef = useRef(null);

  <time datetime="2016-10-25" suppressHydrationWarning />;
  const totalItems = 5; // Total number of cards in the carousel (adjust based on your content)

  function slideCourses(direction) {
    const container = containerRef.current;

    if (!container) return;

    const maxScroll = container.scrollWidth - container.clientWidth;

    let newScrollIndex =
      direction === "next" ? scrollIndex + 1 : scrollIndex - 1;

    if (newScrollIndex < 0) {
      newScrollIndex = totalItems - 1; 
    } else if (newScrollIndex >= totalItems) {
      newScrollIndex = 0;
    }

    setScrollIndex(newScrollIndex);

    const scrollAmount = newScrollIndex * (cardWidth + 24);
    container.scrollTo({
      left: Math.min(Math.max(scrollAmount, 0), maxScroll),
      behavior: "smooth",
    });
  }

  return (
    <main className="font-sans bg-[#F9FAFB] text-[#1F2937] ">
      <header
        id="main-header"
        className="absolute top-2 left-0 w-full  z-[999]"
      >
        <div className="max-w-6xl mx-auto px-4 py-1 flex justify-between items-center">
          <h1 className="text-2xl font-bold">
            <span className="text-[#4F46E5]">Academia</span>.ai
          </h1>
          <nav className="hidden md:flex text-gray-700 space-x-6 font-medium">
            <a href="#home" className="hover:underline">
              Home
            </a>
            <a href="#about" className="hover:underline">
              About
            </a>
            <a href="#courses" className="hover:underline">
              Courses
            </a>
            <a href="#testimonials" className="hover:underline">
              Testimonials
            </a>
            <a href="#contact" className="hover:underline">
              Contact
            </a>
          </nav>

         <div>
  <a
    href="/login"
    className="bg-white mr-4 text-[#1F2937] border border-[#4F46E5] px-6 py-2 rounded-lg hover:bg-gray-100"
  >
    Sign in
  </a>
  <a
    href="/register"
    className="bg-[#4F46E5] hover:bg-[#4338ca] text-white px-6 py-2 rounded-lg transition-colors"
  >
    Sign Up
  </a>
</div>

        </div>
      </header>

      <div className="max-w-7xl mb-10 mx-auto px-6 min-h-screen flex flex-col lg:flex-row items-center justify-center gap-10 pt-24">
        <section id="home" className="max-w-sm flex flex-col gap-6">
          <div className="flex items-center gap-1">
            <Star className="text-yellow-400 text-lg" />
            <Star className="text-yellow-400 text-lg" />
            <Star className="text-yellow-400 text-lg" />
            <Star className="text-yellow-400 text-lg" />
            <Star className="text-yellow-400 text-lg" />
          </div>
          <p className="text-sm font-semibold text-slate-800">
            Trusted by
            <span className="font-bold"> 8,000+ </span>
            students around the world
          </p>

          <h1 className="text-slate-800 font-extrabold text-4xl sm:text-5xl leading-tight">
            Learn without limits and spread knowledge.
          </h1>

          <p className="text-slate-600 text-base sm:text-md max-w-md">
            Are you looking for high-quality online courses, you have come to
            the right place! So, put away your worries and start learning with
            Training Tale.
          </p>
          <a
            className="bg-[#4F46E5] hover:bg-[#4338ca] text-white font-semibold rounded-full px-6 py-3 w-max transition"
            href="/login"
          >
            Get Started
          </a>
        </section>
        <section className="flex flex-wrap justify-center lg:justify-start gap-6 max-w-sm">
          <div className="bg-blue-600 rounded-xl overflow-hidden max-w-[140px] sm:max-w-[160px] md:max-w-[180px]">
            <img
              alt="Young woman in yellow jacket holding folder and making OK gesture, on blue background"
              className="w-full h-full object-cover"
              height="480"
              src="https://storage.googleapis.com/a1aa/image/2cf332d5-3c37-45c7-ef60-57058ccb47d3.jpg"
              width="180"
            />
          </div>
          <div className="bg-orange-500 rounded-xl overflow-hidden max-w-[140px] sm:max-w-[160px] md:max-w-[180px]">
            <img
              alt="Young man with curly hair wearing headphones and holding books giving thumbs up, on orange background"
              className="w-full h-full object-cover"
              height="320"
              src="https://storage.googleapis.com/a1aa/image/7cb5765b-3a6b-4bb1-598d-67c25e15a991.jpg"
              width="180"
            />
          </div>
          <div className="bg-yellow-400 rounded-xl overflow-hidden max-w-[140px] sm:max-w-[160px] md:max-w-[180px]">
            <img
              alt="Young woman with short hair wearing glasses reading a book, on yellow background"
              className="w-full h-full object-cover"
              height="320"
              src="https://storage.googleapis.com/a1aa/image/fe09de7e-ba65-4e81-a7bd-e0a3f11a4f3f.jpg"
              width="180"
            />
          </div>
          <div className="bg-teal-800 rounded-xl overflow-hidden max-w-[140px] sm:max-w-[160px] md:max-w-[180px]">
            <img
              alt="Smiling man with headphones and backpack holding a tablet, on teal background"
              className="w-full h-full object-cover"
              height="240"
              src="https://storage.googleapis.com/a1aa/image/bf74d817-8f8d-4f88-6556-2e14ca614d4b.jpg"
              width="180"
            />
          </div>
          <div className="bg-blue-600 rounded-xl overflow-hidden max-w-[140px] sm:max-w-[160px] md:max-w-[180px]"></div>
        </section>
      </div>

      {/* <!-- About --> */}
      <div id="about" className="w-full bg-[#4f51e1]">
        <section className="max-w-6xl mx-auto text-white flex flex-wrap justify-center sm:justify-between items-center gap-6 px-6 py-6 sm:py-8">
          <div className="flex items-center space-x-3">
            <div className="text-2xl sm:text-3xl font-extrabold leading-none">
              7K+
            </div>
            <div className="text-xs sm:text-sm font-normal leading-tight">
              Success Stories
            </div>
          </div>

          <div className="text-[#c7c9ff] text-2xl hidden sm:inline select-none">
            +
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-2xl sm:text-3xl font-extrabold leading-none">
              300+
            </div>
            <div className="text-xs sm:text-sm font-normal leading-tight">
              Expert Mentors
            </div>
          </div>

          <div className="text-[#c7c9ff] text-2xl hidden sm:inline select-none">
            +
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-2xl sm:text-3xl font-extrabold leading-none">
              150K+
            </div>
            <div className="text-xs sm:text-sm font-semibold uppercase leading-tight">
              Students Joined
            </div>
          </div>

          <div className="text-[#c7c9ff] text-2xl hidden sm:inline select-none">
            +
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-2xl sm:text-3xl font-extrabold leading-none">
              250+
            </div>
            <div className="text-xs sm:text-sm font-normal leading-tight">
              Trendy Courses
            </div>
          </div>
        </section>
      </div>

      {/* <!-- 2nd Page --> */}
      <section className="max-w-7xl mx-auto px-6 py-12 sm:py-20 flex flex-col-reverse md:flex-row justify-center items-center md:items-start gap-10 md:gap-20">
        <div className="relative flex-shrink-0 w-[280px] h-80 sm:w-[370px] sm:h-[380px] md:w-[380px] md:h-[384px] flex justify-center items-center">
          <img
            alt="Women"
            className="object-cover w-full h-full"
            height="450"
            src="https://fosterhigh.pl/wp-content/uploads/2023/08/AdobeStock_249777683-e1691145397610-1-995x1024.webp"
            width="420"
          />
        </div>

        <div className="max-w-xl text-center md:text-left">
          <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight text-black">
            Discover knowledge in
            <br />
            limitless realms.
          </h1>
          <p className="mt-5 text-sm sm:text-base font-normal text-gray-900 max-w-md">
            Education serves as the cornerstone of personal and societal
            development. It is a dynamic process that empowers individuals with
            knowledge, skills, and critical thinking abilities essential.
          </p>
          <button className="bg-[#4F46E5] mt-8 hover:bg-[#4338ca] text-white font-semibold rounded-full px-6 py-3 w-max transition">
            Learn More
          </button>
        </div>
      </section>

      {/* <!-- courses --> */}
      <div
        id="courses"
        className="relative bg-[#4346b3] min-h-screen flex flex-col items-center justify-center px-4 py-10 overflow-hidden"
      >
        <div className="hidden sm:block absolute top-20 left-6 w-24 h-24 rounded-full bg-[#EFC93B] z-0"></div>
        <div className="hidden sm:block absolute bottom-36 left-0 w-24 h-24 rounded-full bg-[#F36B3C] z-0"></div>
        <div className="hidden sm:block absolute top-52 right-0 w-24 h-24 rounded-full bg-[#F36B3C] z-0"></div>

        <h1 className="text-white text-center font-semibold text-3xl sm:text-4xl max-w-4xl leading-tight mb-10 z-10">
          Explore the optimum <br />
          course options.
        </h1>

        <div
        ref={containerRef}
          className="hide-scrollbar flex gap-6 max-w-7xl overflow-x-auto scroll-smooth w-full pb-4 z-10"
        >
          <div className="bg-white rounded-xl overflow-hidden min-w-[320px] shadow-lg flex flex-col">
            <img
              className="w-full h-48 object-cover"
              src="https://storage.googleapis.com/a1aa/image/624494a2-bc06-4e08-f62d-1a789c0b9dfe.jpg"
              alt="Programming"
            />
            <div className="p-5 flex flex-col flex-grow">
              <span className="text-[#5559E9] text-xs font-semibold uppercase tracking-wide mb-1">
                PROGRAMING
              </span>
              <h2 className="text-black font-semibold text-lg mb-1 leading-tight">
                Fundamental Of Basic Programming
              </h2>
              <p className="text-gray-700 text-sm mb-4">by Alexandra</p>
              <div className="flex text-gray-600 text-xs mb-6 space-x-6">
                <div className="flex items-center space-x-1">
                  <i className="far fa-clock text-xs"></i>
                  <span>20hr 50min</span>
                </div>
                <div className="flex items-center space-x-1">
                  <i className="far fa-file-alt text-xs"></i>
                  <span>14 Courses</span>
                </div>
                <div className="flex items-center space-x-1">
                  <i className="fas fa-share-alt text-xs"></i>
                  <span>132 sales</span>
                </div>
                \
              </div>
              <div className="mt-auto flex items-center justify-between">
                <span className="text-[#5559E9] font-semibold text-base">
                  $100
                </span>
                <button className="bg-[#5559E9] text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-[#4346b3] transition">
                  Join Course
                </button>
              </div>
            </div>
          </div>
          {/* <!-- CARD 1 --> */}
          <div className="bg-white rounded-xl overflow-hidden min-w-[320px] shadow-lg flex flex-col">
            <img
              className="w-full h-48 object-cover"
              src="https://web.dev/images/social-wide.jpg"
              alt="Web Development"
            />
            <div className="p-5 flex flex-col flex-grow">
              <span className="text-[#5559E9] text-xs font-semibold uppercase tracking-wide mb-1">
                WEB DEV
              </span>
              <h2 className="text-black font-semibold text-lg mb-1 leading-tight">
                Mastering Web Development
              </h2>
              <p className="text-gray-700 text-sm mb-4">by John Doe</p>
              <div className="flex text-gray-600 text-xs mb-6 space-x-6">
                <div className="flex items-center space-x-1">
                  <i className="far fa-clock text-xs"></i>
                  <span>15hr 30min</span>
                </div>
                <div className="flex items-center space-x-1">
                  <i className="far fa-file-alt text-xs"></i>
                  <span>10 Courses</span>
                </div>
                <div className="flex items-center space-x-1">
                  <i className="fas fa-share-alt text-xs"></i>
                  <span>200 sales</span>
                </div>
              </div>
              <div className="mt-auto flex items-center justify-between">
                <span className="text-[#5559E9] font-semibold text-base">
                  $89
                </span>
                <button className="bg-[#5559E9] text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-[#4346b3] transition">
                  Join Course
                </button>
              </div>
            </div>
          </div>

          {/* <!-- CARD 2 --> */}
          <div className="bg-white rounded-xl overflow-hidden min-w-[320px] shadow-lg flex flex-col">
            <img
              className="w-full h-48 object-cover"
              src="https://www.mygreatlearning.com/blog/wp-content/uploads/2019/09/What-is-data-science-2.jpg"
              alt="Data Science"
            />
            <div className="p-5 flex flex-col flex-grow">
              <span className="text-[#5559E9] text-xs font-semibold uppercase tracking-wide mb-1">
                DATA SCIENCE
              </span>
              <h2 className="text-black font-semibold text-lg mb-1 leading-tight">
                Intro to Data Science
              </h2>
              <p className="text-gray-700 text-sm mb-4">by Sarah Lin</p>
              <div className="flex text-gray-600 text-xs mb-6 space-x-6">
                <div className="flex items-center space-x-1">
                  <i className="far fa-clock text-xs"></i>
                  <span>25hr 10min</span>
                </div>
                <div className="flex items-center space-x-1">
                  <i className="far fa-file-alt text-xs"></i>
                  <span>18 Courses</span>
                </div>
                <div className="flex items-center space-x-1">
                  <i className="fas fa-share-alt text-xs"></i>
                  <span>320 sales</span>
                </div>
              </div>
              <div className="mt-auto flex items-center justify-between">
                <span className="text-[#5559E9] font-semibold text-base">
                  $120
                </span>
                <button className="bg-[#5559E9] text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-[#4346b3] transition">
                  Join Course
                </button>
              </div>
            </div>
          </div>

          {/* <!-- CARD 3 --> */}
          <div className="bg-white rounded-xl overflow-hidden min-w-[320px] shadow-lg flex flex-col">
            <img
              className="w-full h-48 object-cover"
              src="https://ischool.syracuse.edu/wp-content/uploads/what-is-machine-learning-1024x683.png"
              alt="ML Course"
            />
            <div className="p-5 flex flex-col flex-grow">
              <span className="text-[#5559E9] text-xs font-semibold uppercase tracking-wide mb-1">
                AI & ML
              </span>
              <h2 className="text-black font-semibold text-lg mb-1 leading-tight">
                Machine Learning A-Z
              </h2>
              <p className="text-gray-700 text-sm mb-4">by Kevin Hart</p>
              <div className="flex text-gray-600 text-xs mb-6 space-x-6">
                <div className="flex items-center space-x-1">
                  <i className="far fa-clock text-xs"></i>
                  <span>30hr</span>
                </div>
                <div className="flex items-center space-x-1">
                  <i className="far fa-file-alt text-xs"></i>
                  <span>20 Courses</span>
                </div>
                <div className="flex items-center space-x-1">
                  <i className="fas fa-share-alt text-xs"></i>
                  <span>500 sales</span>
                </div>
              </div>
              <div className="mt-auto flex items-center justify-between">
                <span className="text-[#5559E9] font-semibold text-base">
                  $150
                </span>
                <button className="bg-[#5559E9] text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-[#4346b3] transition">
                  Join Course
                </button>
              </div>
            </div>
          </div>

          {/* <!-- CARD 4 --> */}
          <div className="bg-white rounded-xl overflow-hidden min-w-[320px] shadow-lg flex flex-col">
            <img
              className="w-full h-48 object-cover"
              src="https://media.licdn.com/dms/image/v2/D5612AQGrWJClop4C4A/article-cover_image-shrink_600_2000/article-cover_image-shrink_600_2000/0/1669263859932?e=2147483647&v=beta&t=9uw81zWwTGYhkl0O8tyqUpOU8XExyaDPdOOJO1DQ8mU"
              alt="Cybersecurity"
            />
            <div className="p-5 flex flex-col flex-grow">
              <span className="text-[#5559E9] text-xs font-semibold uppercase tracking-wide mb-1">
                SECURITY
              </span>
              <h2 className="text-black font-semibold text-lg mb-1 leading-tight">
                Ethical Hacking Basics
              </h2>
              <p className="text-gray-700 text-sm mb-4">by Linda Parker</p>
              <div className="flex text-gray-600 text-xs mb-6 space-x-6">
                <div className="flex items-center space-x-1">
                  <i className="far fa-clock text-xs"></i>
                  <span>18hr</span>
                </div>
                <div className="flex items-center space-x-1">
                  <i className="far fa-file-alt text-xs"></i>
                  <span>12 Courses</span>
                </div>
                <div className="flex items-center space-x-1">
                  <i className="fas fa-share-alt text-xs"></i>
                  <span>170 sales</span>
                </div>
              </div>
              <div className="mt-auto flex items-center justify-between">
                <span className="text-[#5559E9] font-semibold text-base">
                  $99
                </span>
                <button className="bg-[#5559E9] text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-[#4346b3] transition">
                  Join Course
                </button>
              </div>
            </div>
          </div>

          {/* <!-- CARD 5 --> */}
          <div className="bg-white rounded-xl overflow- min-w-[320px] shadow-lg flex flex-col">
            <img
              className="w-full h-48 object-cover"
              src="https://storage.googleapis.com/cms-storage-bucket/70760bf1e88b184bb1bc.png"
              alt="App Development"
            />
            <div className="p-5 flex flex-col flex-grow">
              <span className="text-[#5559E9] text-xs font-semibold uppercase tracking-wide mb-1">
                MOBILE APP
              </span>
              <h2 className="text-black font-semibold text-lg mb-1 leading-tight">
                Flutter App Development
              </h2>
              <p className="text-gray-700 text-sm mb-4">by Ayesha Khan</p>
              <div className="flex text-gray-600 text-xs mb-6 space-x-6">
                <div className="flex items-center space-x-1">
                  <i className="far fa-clock text-xs"></i>
                  <span>22hr 45min</span>
                </div>
                <div className="flex items-center space-x-1">
                  <i className="far fa-file-alt text-xs"></i>
                  <span>15 Courses</span>
                </div>
                <div className="flex items-center space-x-1">
                  <i className="fas fa-share-alt text-xs"></i>
                  <span>260 sales</span>
                </div>
              </div>
              <div className="mt-auto flex items-center justify-between">
                <span className="text-[#5559E9] font-semibold text-base">
                  $110
                </span>
                <button className="bg-[#5559E9] text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-[#4346b3] transition">
                  Join Course
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* <!-- Navigation Arrows --> */}
        <div className="flex space-x-4 mt-10 z-10">
          <button
              onClick={() => slideCourses("prev")}
            aria-label="Previous"
            className="cursor-pointer bg-white w-10 h-10 rounded-full flex items-center justify-center text-[#5559E9] hover:bg-[#e0e0ff] transition"
          >
            <ChevronLeft className="text-lg" />
          </button>
          <button
              onClick={() => slideCourses("next")}
            aria-label="Next"
            className="cursor-pointer bg-white w-10 h-10 rounded-full flex items-center justify-center text-[#5559E9] hover:bg-[#e0e0ff] transition"
          >
            <ChevronRight className="text-lg" />
          </button>
        </div>
      </div>

      {/* <!-- Reviews --> */}
      <div
        id="testimonials"
        className="bg-[#f7f7f7] min-h-screen flex flex-col justify-center items-center py-16 px-4"
      >
        <h1 className="mb-10 text-black text-center font-extrabold text-[36px] leading-[44px] max-w-[400px] sm:max-w-none sm:text-[40px] sm:leading-[48px]">
          Reviews from <br />
          satisfied students
        </h1>
        <div className="relative w-full max-w-[1200px] mt-12 flex flex-col sm:flex-row gap-6 sm:gap-8 px-2 sm:px-0">
          <div className="absolute -top-10 left-16 w-24 h-24 rounded-full bg-[#f9632a] hidden sm:block"></div>

          <div className="bg-white rounded-xl border border-transparent shadow-sm p-6 flex flex-col justify-between max-w-[360px] sm:max-w-[360px] z-10">
            <p className="text-[14px] leading-5 text-[#2a2a2a] mb-6">
              "I can't express how grateful I am for this website. The quality
              of the educational content here is top-notch."
            </p>
            <hr className="border-t border-gray-300 mb-3" />
            <div>
              <a
                href="#"
                className="text-[#4a51f0] font-semibold text-[14px] leading-5"
              >
                Isabella Nguyen
              </a>
              <p className="text-[12px] leading-4 text-[#4a4a4a]">Programmer</p>
            </div>
          </div>
{/* <div className="absolute -top-10 left-100 w-24 h-24 rounded-full bg-[#f9632a] hidden sm:block"></div> */}

          <div className="bg-white rounded-xl border border-transparent shadow-sm p-6 flex flex-col justify-between max-w-[360px] sm:max-w-[360px] z-10 relative">
            <p className="text-[14px] leading-5 text-[#2a2a2a] mb-6">
              "I can't express how grateful I am for this website. The quality
              of the educational content here is top-notch."
            </p>
            <hr className="border-t border-gray-300 mb-3" />
            <div>
              <a
                href="#"
                className="text-[#4a51f0] font-semibold text-[14px] leading-5"
              >
                Hendar Mindor
              </a>
              <p className="text-[12px] leading-4 text-[#4a4a4a]">
                UI/UX designer
              </p>
            </div>
          </div>
{/* <div className="absolute -top-10 left-200 w-24 h-24 rounded-full bg-[#f9632a] hidden sm:block"></div> */}

          
          <div className="bg-white rounded-xl border border-transparent shadow-sm p-6 flex flex-col justify-between max-w-[360px] sm:max-w-[360px] z-10">
            <p className="text-[14px] leading-5 text-[#2a2a2a] mb-6">
              "I can't express how grateful I am for this website. The quality
              of the educational content here is top-notch."
            </p>
            <hr className="border-t border-gray-300 mb-3" />
            <div>
              <a
                href="#"
                className="text-[#4a51f0] font-semibold text-[14px] leading-5"
              >
                Hendar Mindor
              </a>
              <p className="text-[12px] leading-4 text-[#4a4a4a]">
                Graphic design
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* <!-- footer --> */}

      {/* <!-- Subscribe Section --> */}
      <section
        id="contact"
        className="bg-[#4B55E3] relative overflow-hidden py-16 px-4 sm:px-6 lg:px-8 flex flex-col items-center"
      >
        <h2 className="text-white text-center font-bold text-4xl leading-tight max-w-xl">
          Subscribe For Get
          <br />
          Update
        </h2>
        <form
          action="#"
          className="mt-8 w-full max-w-xl flex rounded-full border-4 border-white overflow-hidden"
          method="POST"
        >
          <input
            className="flex-grow px-6 bg-white py-3 rounded-l-full text-gray-700 placeholder-gray-400 focus:outline-none"
            placeholder="Your Email Address...."
            required=""
            type="email"
          />
          <button
            className="bg-[#4B55E3] cursor-pointer text-white px-6 py-3 rounded-r-full hover:bg-[#3a3fc9] transition-colors duration-300"
            type="submit"
          >
            Get Started
          </button>
        </form>
        {/* <!-- Left orange circle --> */}
        <img
          alt="Decorative orange circle on left side"
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full h-[100px] w-[100px]"
          height="100"
          src="https://storage.googleapis.com/a1aa/image/685719be-5b72-46d2-4889-bfc1054c2365.jpg"
          width="100"
        />
        {/* <!-- Right yellow circle --> */}
        <img
          alt="Decorative yellow circle on right side"
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 rounded-full h-[100px] w-[100px]"
          height="100"
          src="https://storage.googleapis.com/a1aa/image/1913af0c-6ed8-457a-0f7a-208caedf7cc6.jpg"
          width="100"
        />
      </section>
      {/* <!-- Footer Section --> */}
      <footer className="bg-gray-50 pt-16 pb-6 px-6 sm:px-12 lg:px-24">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-y-10 gap-x-8 text-sm text-gray-900">
          <div className="space-y-2 col-span-1 sm:col-span-2">
            <h3 className="font-bold text-lg text-[#4B55E3]">
              Academia.
              <span className="font-extrabold">ai</span>
            </h3>
            <p>
              Easily access online learning
              <br />
              from anywhere.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-bold">className</h4>
            <ul className="space-y-1">
              <li>UI/UX Design</li>
              <li>Development</li>
              <li>language</li>
              <li>Mathematics</li>
              <li>Biology</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold">Resources</h4>
            <ul className="space-y-1">
              <li>About us</li>
              <li>Career</li>
              <li>Media</li>
              <li>Contact</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-bold">Company</h4>
            <ul className="space-y-1">
              <li>About us</li>
              <li>Career</li>
              <li>Media</li>
              <li>Contact</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-bold">Follow us</h4>
            <ul className="space-y-1">
              <li>Facebook</li>
              <li>Instagram</li>
              <li>Twitter</li>
              <li>Youtube</li>
            </ul>
          </div>
        </div>
        <hr className="border-gray-300 mt-10" />
        <p className="text-center text-xs text-gray-600 mt-4">
          Reserved Rights All 2025, academiaRightCopy
        </p>
      </footer>
    </main>
  );
}
