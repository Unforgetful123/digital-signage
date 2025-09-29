import React from 'react'
import ContentUpload   from '../components/ContentUpload'
import BirthdayUpload  from '../components/BirthdayUpload'
import EmergencyAlert  from '../components/EmergencyAlert'
import PPTUpload       from '../components/PPTUpload'

export default function Dashboard() {
  return (
    <div className="dashboard-grid">
      <div className="card"><ContentUpload /></div>
      <div className="card"><BirthdayUpload /></div>
      <div className="card emergency-card"><EmergencyAlert /></div>
      <div className="card"><PPTUpload /></div>
    </div>
  )
}
