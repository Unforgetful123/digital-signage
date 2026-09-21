import React, { useState, useEffect } from 'react';
import pb from '../services/pocketbase';
import toast from 'react-hot-toast';

export default function PlaylistManager() {
  const [contentList, setContentList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch all content on load
  const fetchContent = async () => {
    try {
      setLoading(true);
      const records = await pb.collection('content').getFullList({
        sort: '-created', // Newest first
        requestKey: null
      });
      setContentList(records);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load playlist.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContent();
  }, []);

  // Delete handler
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this media?')) return;
    try {
      await pb.collection('content').delete(id);
      toast.success('Deleted successfully');
      fetchContent(); // Refresh the list
    } catch (err) {
      toast.error('Failed to delete.');
    }
  };

  // 🎯 NEW: Helper function to format the ISO dates into a readable format
  const formatDuration = (start, end) => {
    if (!start && !end) return <span style={{ color: '#16a34a', fontWeight: '500' }}>Always Live</span>;
    
    const options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    const startTime = start ? new Date(start).toLocaleString(undefined, options) : 'Now';
    const endTime = end ? new Date(end).toLocaleString(undefined, options) : 'Forever';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.85rem' }}>
        <span style={{ color: '#0284c7' }}>🟢 {startTime}</span>
        <span style={{ color: '#dc2626' }}>🔴 {endTime}</span>
      </div>
    );
  };

  return (
    <div style={{ background: '#ffffff', borderRadius: '8px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b' }}>Current Playlist</h2>
        <button onClick={fetchContent} style={{ color: '#f6f7f8',padding: '8px 12px', background: '#316aa4', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>
           Refresh
        </button>
      </div>

      {loading ? (
        <p>Loading playlist...</p>
      ) : contentList.length === 0 ? (
        <p style={{ color: '#64748b' }}>No media uploaded yet.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                <th style={{ padding: '12px', width: '25%' }}>Title</th>
                <th style={{ padding: '12px', width: '15%' }}>Type</th>
                <th style={{ padding: '12px', width: '15%' }}>Target Location</th>
                {/* 🎯 NEW: Duration Column Header */}
                <th style={{ padding: '12px', width: '30%' }}>Live Duration</th>
                <th style={{ padding: '12px', width: '15%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contentList.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px', fontWeight: '500', color: '#0f172a' }}>{item.title}</td>
                  <td style={{ padding: '12px', textTransform: 'capitalize' }}>
                    {item.type === 'youtube' ? 'YouTube' : item.type === 'ppt' ? 'PDF' : `${item.type}`}
                  </td>
                  <td style={{ padding: '12px' }}>{item.location || 'Global'}</td>
                  
                  {/* 🎯 NEW: Duration Column Data */}
                  <td style={{ padding: '12px' }}>
                    {formatDuration(item.start_time, item.end_time)}
                  </td>

                  <td style={{ padding: '12px' }}>
                    <button 
                      onClick={() => handleDelete(item.id)}
                      style={{ padding: '6px 12px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}