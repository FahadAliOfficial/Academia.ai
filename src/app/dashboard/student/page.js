'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '../../components/LoadingSpinner'

export default function StudentDashboardPage() {
  const router = useRouter()
  const [userData, setUserData] = useState(null)
  const [userID, setUserID] = useState('')

  // Auth and Role Check
  useEffect(() => {
    const fetchData = async () => {
      const { data, error: authError } = await supabase.auth.getUser()

      if (authError || !data?.user) {
        router.push('/login')
        return
      }

      const user = data.user
      setUserID(user.id)

      const { data: userDetails, error: userError } = await supabase
        .from('users')
        .select('name, role')
        .eq('id', user.id)
        .single()

      if (userError || !userDetails || userDetails.role !== 'student') {
        router.push('/login')
        return
      }

      setUserData(userDetails)
    }

    fetchData()
  }, [router])

  const [todos, setTodos] = useState([])
  const [newTodo, setNewTodo] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')

  useEffect(() => {
    if (userID) fetchTodos()
  }, [userID])

  const fetchTodos = async () => {
    const { data, error } = await supabase
      .from('studenttodo')
      .select('id, task, created_at')
      .eq('student_id', userID)

    if (error) {
      console.error("Error fetching todos:", error)
    } else {
      setTodos(Array.isArray(data) ? data : [])
    }
  }

  const handleAddTodo = async () => {
    if (newTodo.trim() !== '') {
      const { data, error } = await supabase
        .from('studenttodo')
        .insert([{ task: newTodo, student_id: userID }])
        .select()

      if (error) {
        console.error("Error adding todo:", error)
      } else {
        if (Array.isArray(data)) {
          setTodos(prev => [...prev, ...data])
        } else {
          setTodos(prev => [...prev, data])
        }
        setNewTodo('')
        fetchTodos()
      }
    }
  }

  const handleDeleteTodo = async (id) => {
    const { error } = await supabase
      .from('studenttodo')
      .delete()
      .eq('id', id)

    if (error) {
      console.error("Error deleting todo:", error)
    } else {
      setTodos(todos.filter(todo => todo.id !== id))
    }
  }

  const handleEditTodo = (id, text) => {
    setEditingId(id)
    setEditText(text)
  }

  const handleSaveEdit = async (id) => {
    const { data, error } = await supabase
      .from('studenttodo')
      .update({ task: editText })
      .eq('id', id)
      .select()

    if (error) {
      console.error("Error updating todo:", error)
    } else {
      setTodos(todos.map(todo => todo.id === id ? { ...todo, task: editText } : todo))
      setEditingId(null)
      setEditText('')
    }
  }

  if (!userData) return <LoadingSpinner />

  return (
    <div className="p-6 bg-[#F9FAFB] min-h-screen overflow-y-auto">
      <h1 className="text-3xl font-bold text-[#1F2937] mb-6">
        Welcome, {userData.name} 🎓
      </h1>

      {/* Student Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <div className="bg-white p-4 rounded-2xl shadow-md">
          <h3 className="text-lg font-semibold text-[#4F46E5]">Courses Enrolled</h3>
          <p className="text-2xl text-[#1F2937] mt-1">4</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-md">
          <h3 className="text-lg font-semibold text-[#4F46E5]">Assignments Due</h3>
          <p className="text-2xl text-[#1F2937] mt-1">2</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-md">
          <h3 className="text-lg font-semibold text-[#4F46E5]">Lectures Attended</h3>
          <p className="text-2xl text-[#1F2937] mt-1">18</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-md">
          <h3 className="text-lg font-semibold text-[#4F46E5]">Tasks Completed</h3>
          <p className="text-2xl text-[#1F2937] mt-1">{todos.length}</p>
        </div>
      </div>

      {/* Todo Section */}
      <section>
        <h2 className="text-xl font-semibold text-[#4F46E5] mb-3">Your To-do List</h2>
        <div className="flex items-center gap-3 mb-4">
          <input
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            placeholder="Add a new task..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5] text-black"
          />
          <button
            onClick={handleAddTodo}
            className="bg-[#4F46E5] text-white px-4 py-2 rounded-lg hover:bg-[#4338ca] transition"
          >
            Add
          </button>
        </div>
        <ul className="space-y-2">
          {todos?.map((todo) => (
            <li key={todo.id} className="bg-white px-4 py-2 rounded-lg shadow flex items-center justify-between">
              {editingId === todo.id ? (
                <input
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="flex-1 px-2 py-1 border text-black border-gray-300 rounded mr-2"
                />
              ) : (
                <span className="text-[#1F2937] flex-1">{todo.task}</span>
              )}
              <div className="flex gap-2 ml-4">
                {editingId === todo.id ? (
                  <button
                    onClick={() => handleSaveEdit(todo.id)}
                    className="text-sm bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                  >
                    Save
                  </button>
                ) : (
                  <button
                    onClick={() => handleEditTodo(todo.id, todo.task)}
                    className="text-sm bg-yellow-400 text-white px-3 py-1 rounded hover:bg-yellow-500"
                  >
                    Edit
                  </button>
                )}
                <button
                  onClick={() => handleDeleteTodo(todo.id)}
                  className="text-sm bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
