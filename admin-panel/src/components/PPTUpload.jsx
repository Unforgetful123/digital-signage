import React, { useState } from 'react'
import { supabase } from '../api/supabase'

export default function PPTUpload() {
  const [title, setTitle]         = useState('')
  const [file, setFile]           = useState(null)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime]     = useState('')
  const [loading, setLoading]     = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    if (!title.trim() || !file || !startTime || !endTime) {
      return alert('Please complete all fields.')
    }

    setLoading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `public/ppt/${Date.now()}_${title.replace(/\s+/g,'_')}.${ext}`
      const { data: up, error: upErr } = await supabase
        .storage.from('media').upload(path, file)
      if (upErr) throw upErr

      const { data: urlD, error: urlErr } = supabase
        .storage.from('media').getPublicUrl(up.path)
      if (urlErr) throw urlErr

      const { error: insErr } = await supabase
        .from('content')
        .insert([{
          title,
          type:       'ppt',
          media_url:  urlD.publicUrl,
          start_time: new Date(startTime).toISOString(),
          end_time:   new Date(endTime).toISOString(),
          priority:   1
        }])
      if (insErr) throw insErr

      alert('PPT scheduled!')
      setTitle('')
      setFile(null)
      setStartTime('')
      setEndTime('')
    } catch (err) {
      console.error(err)
      alert('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form-card">
      <h2 className="card-heading">Upload &amp; Schedule PPT</h2>

      <div className="form-group">
        <label htmlFor="ppt-title">Title</label>
        <input
          id="ppt-title"
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="ppt-file">Select PPT File</label>
        <input
          id="ppt-file"
          type="file"
          accept=".ppt,.pptx"
          onChange={e => setFile(e.target.files[0])}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="ppt-start">Start Time</label>
        <input
          id="ppt-start"
          type="datetime-local"
          value={startTime}
          onChange={e => setStartTime(e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="ppt-end">End Time</label>
        <input
          id="ppt-end"
          type="datetime-local"
          value={endTime}
          onChange={e => setEndTime(e.target.value)}
          required
        />
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Uploading…' : 'Upload &amp; Schedule'}
      </button>
    </form>
  )
}
