import React, { useState } from 'react'
import pb from '../services/pocketbase'   // ✅ use PocketBase instead of Supabase

export default function BirthdayUpload() {
  const [name, setName] = useState('')
  const [designation, setDesignation] = useState('')
  const [dob, setDob] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [videoFile, setVideoFile] = useState(null)
  const [staff, setStaff] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()

    if (!name || !designation || !dob) {
      return alert("Please fill in Name, Designation, and Date of Birth.")
    }

    setLoading(true)
    try {
      // ✅ Use FormData for PocketBase (handles files + text fields)
      const formData = new FormData()
      formData.append('name', name)
      formData.append('designation', designation)
      formData.append('dob', new Date(dob).toISOString()) // PB date field works with ISO strings
      if (photoFile) formData.append('photo', photoFile)  // field name must match PB schema
      if (videoFile) formData.append('video', videoFile)  // field name must match PB schema

      // ✅ Insert record into PocketBase
      await pb.collection('birthday').create(formData)

      // ✅ Show success using local state
      setStaff({ name, designation })
    } catch (err) {
      console.error('Birthday upload error:', err)
      alert(err?.response?.message || err.message || "There was an error saving the birthday.")
    } finally {
      setLoading(false)
    }
  }

  if (staff) {
    return (
      <div className="birthday-success-card">
        <h2>🎉 Birthday Added!</h2>
        <p>
          <strong>{staff.name}</strong> ({staff.designation}) was saved successfully.
        </p>
        <button
          onClick={() => {
            setName('')
            setDesignation('')
            setDob('')
            setPhotoFile(null)
            setVideoFile(null)
            setStaff(null)
          }}
          disabled={loading}
          className="btn btn-primary"
        >
          Add Another
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="birthday-form">
      <h2>Add Birthday</h2>

      <div className="form-group">
        <label htmlFor="birthday-name">Name</label>
        <input
          id="birthday-name"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="birthday-designation">Designation</label>
        <input
          id="birthday-designation"
          type="text"
          value={designation}
          onChange={e => setDesignation(e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="birthday-dob">Date of Birth</label>
        <input
          id="birthday-dob"
          type="date"
          value={dob}
          onChange={e => setDob(e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="birthday-photo">Upload Photo</label>
        <input
          id="birthday-photo"
          type="file"
          accept="image/*"
          onChange={e => setPhotoFile(e.target.files[0])}
        />
      </div>

      <div className="form-group">
        <label htmlFor="birthday-video">Upload Video (optional)</label>
        <input
          id="birthday-video"
          type="file"
          accept="video/*"
          onChange={e => setVideoFile(e.target.files[0])}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn btn-success"
      >
        {loading ? "Saving..." : "Add Birthday"}
      </button>
    </form>
  )
}
