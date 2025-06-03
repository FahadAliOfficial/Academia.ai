'use client';

import React, { useState, useEffect } from 'react';
import { courses } from '../static-exam-data/courses';
import { chapters } from '../static-exam-data/chapters';
import { questions as allQuestions } from '../static-exam-data/questions';

export default function FreeExamPage() {
  const [selectedCourse, setSelectedCourse] = useState('');
  const [availableChapters, setAvailableChapters] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState('');
  const [currentQuestions, setCurrentQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});
  const [testState, setTestState] = useState('selecting'); // 'selecting', 'in-progress', 'completed'
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (selectedCourse) {
      setAvailableChapters(chapters.filter(ch => ch.courseId === selectedCourse));
      setSelectedChapter(''); // Reset chapter selection when course changes
      setCurrentQuestions([]);
      setTestState('selecting');
    } else {
      setAvailableChapters([]);
    }
  }, [selectedCourse]);

  const handleStartTest = () => {
    if (!selectedCourse || !selectedChapter) {
      alert('Please select a course and a chapter.');
      return;
    }
    const chapterQuestions = allQuestions[selectedChapter] || [];
    setCurrentQuestions(chapterQuestions);
    setUserAnswers({});
    setScore(0);
    setTestState('in-progress');
  };

  const handleAnswerChange = (questionId, answer) => {
    setUserAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmitTest = () => {
    let correctAnswers = 0;
    currentQuestions.forEach(q => {
      if (userAnswers[q.id] === q.correctAnswer) {
        correctAnswers++;
      }
    });
    setScore(correctAnswers);
    setTestState('completed');
  };

  const handleRetake = () => {
    setSelectedCourse('');
    setSelectedChapter('');
    setCurrentQuestions([]);
    setUserAnswers({});
    setScore(0);
    setTestState('selecting');
  };

  return (
    <div className="container mx-auto min-w-full p-4 min-h-screen bg-gray-50">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-blue-600">Free Practice Exam</h1>
        <p className="text-gray-600">Select a course and chapter to test your knowledge.</p>
      </header>

      {testState === 'selecting' && (
        <div className="selection-area bg-white p-6 rounded-lg shadow-md max-w-md mx-auto">
          <div className="mb-4">
            <label htmlFor="course-select" className="block text-sm font-medium text-gray-700 mb-1">Select Course:</label>
            <select
              id="course-select"
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="text-black mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">-- Select Course --</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>{course.name}</option>
              ))}
            </select>
          </div>

          {selectedCourse && (
            <div className="mb-6">
              <label htmlFor="chapter-select" className="block text-sm font-medium text-gray-700 mb-1">Select Chapter:</label>
              <select
                id="chapter-select"
                value={selectedChapter}
                onChange={(e) => setSelectedChapter(e.target.value)}
                disabled={!selectedCourse || availableChapters.length === 0}
                className="text-black mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="">-- Select Chapter --</option>
                {availableChapters.map(chapter => (
                  <option key={chapter.id} value={chapter.id}>{chapter.name}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleStartTest}
            disabled={!selectedCourse || !selectedChapter}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded disabled:bg-gray-300"
          >
            Start Test
          </button>
        </div>
      )}

      {testState === 'in-progress' && (
        <div className="questions-area bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">Questions:</h2>
          {currentQuestions.map((q, index) => (
            <div key={q.id} className="mb-6 p-4 border border-gray-200 rounded-md">
              <p className="font-medium text-gray-800 mb-2">{index + 1}. {q.text}</p>
              <div className="space-y-2">
                {q.options.map(option => (
                  <label key={option} className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 cursor-pointer">
                    <input
                      type="radio"
                      name={q.id}
                      value={option}
                      checked={userAnswers[q.id] === option}
                      onChange={() => handleAnswerChange(q.id, option)}
                      className="form-radio h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
                    />
                    <span className="text-gray-700">{option}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          <button
            onClick={handleSubmitTest}
            className="w-full mt-6 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
          >
            Submit Test
          </button>
        </div>
      )}

      {testState === 'completed' && (
        <div className="results-area bg-white p-6 rounded-lg shadow-md text-center max-w-md mx-auto">
          <h2 className="text-3xl font-bold mb-4 text-green-600">Test Completed!</h2>
          <p className="text-xl text-gray-700 mb-2">
            Your Score: <span className="font-bold text-blue-600">{score}</span> out of {currentQuestions.length}
          </p>
          <p className="text-lg text-gray-600 mb-6">
            Percentage: {currentQuestions.length > 0 ? ((score / currentQuestions.length) * 100).toFixed(2) : 0}%
          </p>
          
          <div className="mt-6 mb-8">
            <h3 className="text-xl font-semibold text-gray-700 mb-3">Review Answers:</h3>
            {currentQuestions.map((q, index) => (
              <div key={q.id} className={`p-3 mb-3 rounded-md text-left ${userAnswers[q.id] === q.correctAnswer ? 'bg-green-100 border-l-4 border-green-500' : 'bg-red-100 border-l-4 border-red-500'}`}>
                <p className="font-medium text-gray-800">{index + 1}. {q.text}</p>
                <p className="text-sm text-gray-600">Your answer: <span className={userAnswers[q.id] === q.correctAnswer ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'}>{userAnswers[q.id] || "Not answered"}</span></p>
                {userAnswers[q.id] !== q.correctAnswer && (
                  <p className="text-sm text-green-700">Correct answer: {q.correctAnswer}</p>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleRetake}
            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded"
          >
            Take Another Test
          </button>
        </div>
      )}
    </div>
  );
}
