import React, { useState } from 'react'
import { supabase } from '../api/supabase'

export default function BirthdayUpload() {
  const [name, setName]             = useState('')
  const [designation, setDesignation] = useState('')
  const [dob, setDob]               = useState('')
  const [photoFile, setPhotoFile]   = useState(null)
  const [videoFile, setVideoFile]   = useState(null)
  const [staff, setStaff]           = useState(null)
  const [loading, setLoading]       = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()

    if (!name || !designation || !dob) {
      return alert("Please fill in Name, Designation, and Date of Birth.")
    }

    setLoading(true)
    try {
      // 1️⃣ Upload photo if provided
      let photoUrl = ''
      if (photoFile) {
        const { data: photoData, error: photoError } = await supabase
          .storage.from('media')
          .upload(`birthdays/photos/${Date.now()}_${photoFile.name}`, photoFile)
        if (photoError) throw photoError

        const { data: photoUrlData, error: photoUrlError } = supabase
          .storage.from('media')
          .getPublicUrl(photoData.path)
        if (photoUrlError) throw photoUrlError

        photoUrl = photoUrlData.publicUrl
      }

      // 2️⃣ Upload video if provided
      let videoUrl = ''
      if (videoFile) {
        const { data: videoData, error: videoError } = await supabase
          .storage.from('media')
          .upload(`birthdays/videos/${Date.now()}_${videoFile.name}`, videoFile)
        if (videoError) throw videoError

        const { data: videoUrlData, error: videoUrlError } = supabase
          .storage.from('media')
          .getPublicUrl(videoData.path)
        if (videoUrlError) throw videoUrlError

        videoUrl = videoUrlData.publicUrl
      }

      // 3️⃣ Insert record without expecting data back
      const { error: insertError } = await supabase
        .from('birthdays')
        .insert([{ name, designation, dob, photo_url: photoUrl, video_url: videoUrl }])
      if (insertError) throw insertError

      // 4️⃣ Show success using local state
      setStaff({ name, designation })
    } catch (err) {
      console.error('Birthday upload error:', err)
      alert(err.message || "There was an error saving the birthday.")
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
