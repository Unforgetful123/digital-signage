// admin-panel/src/components/PlaylistManager.jsx
import React, { useState, useEffect } from 'react';
import pb from '../services/pocketbase';

export default function PlaylistManager() {
  const [playlist, setPlaylist] = useState([]);

  // 📡 Fetch Current Playlist & Subscribe to Real-Time Changes
  useEffect(() => {
    const fetchPlaylist = async () => {
      try {
        // 1. Fetch from BOTH collections
        const contentRecords = await pb.collection('content').getFullList({ sort: '-created' });
        const birthdayRecords = await pb.collection('birthday').getFullList({ sort: '-created' });

        // 2. Normalize standard content so it fits the table
        const normalizedContent = contentRecords.map(item => ({
          id: item.id,
          collection: 'content', // Tells the delete button where to look
          title: item.title,
          type: item.type === 'youtube' ? 'YouTube' : item.type,
          location: item.location || 'Global',
          created: item.created
        }));

        // 3. Normalize birthdays so they fit the exact same table format
        const normalizedBirthdays = birthdayRecords.map(item => ({
          id: item.id,
          collection: 'birthday', // Tells the delete button where to look
          title: `🎂 ${item.name} (${item.designation})`,
          type: 'Birthday',
          location: 'Global', // Birthdays are usually global
          created: item.created
        }));

        // 4. Combine them and sort by newest first
        const combinedPlaylist = [...normalizedContent, ...normalizedBirthdays].sort((a, b) => {
          return new Date(b.created) - new Date(a.created);
        });

        setPlaylist(combinedPlaylist);
      } catch (err) {
        console.error("Failed to fetch unified playlist", err);
      }
    };

    fetchPlaylist();

    // 5. Listen for live updates on BOTH collections
    pb.collection('content').subscribe('*', () => fetchPlaylist());
    pb.collection('birthday').subscribe('*', () => fetchPlaylist());

    return () => {
      pb.collection('content').unsubscribe('*');
      pb.collection('birthday').unsubscribe('*');
    };
  }, []);

  // 🗑️ Unified Delete Function
  const handleDeleteContent = async (id, collection, itemTitle) => {
    if (!window.confirm(`Are you sure you want to remove "${itemTitle}" from the screens?`)) return;
    
    try {
      // Deletes from the correct collection dynamically!
      await pb.collection(collection).delete(id);
    } catch (err) {
      console.error(`Failed to delete from ${collection}:`, err);
      alert("Failed to delete. Please try again.");
    }
  };

  return (
    <div className="form-card" style={{ width: "100%", margin: "0 auto" }}>
      <p style={{ marginBottom: '1rem', color: '#888', fontSize: '0.9rem' }}>
        Removing an item here will instantly skip it on all running TVs.
      </p>
      
      {playlist.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#666' }}>No content is currently scheduled.</p>
      ) : (
        <table className="display-table" style={{ width: '100%', textAlign: 'left' }}>
          <thead>
            <tr>
              <th>Title / Name</th>
              <th>Type</th>
              <th>Location</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {playlist.map((item) => (
              <tr key={item.id}>
                <td style={{ fontWeight: 'bold' }}>{item.title}</td>
                <td style={{ textTransform: 'capitalize' }}>
                  {/* Give birthdays a subtle color badge to stand out */}
                  {item.type === 'Birthday' ? (
                    <span style={{ backgroundColor: '#fce7f3', color: '#db2777', padding: '2px 8px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                      Birthday
                    </span>
                  ) : (
                    item.type
                  )}
                </td>
                <td>{item.location}</td>
                <td>
                  <button 
                    // Pass the specific collection name into the delete function
                    onClick={() => handleDeleteContent(item.id, item.collection, item.title)}
                    style={{ 
                      backgroundColor: '#dc3545', 
                      color: 'white', 
                      border: 'none', 
                      padding: '6px 12px', 
                      borderRadius: '4px', 
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                  >
                    Remove from Loop
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}