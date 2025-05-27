import { useEffect, useState } from 'react';
import { supabase } from '../api/supabase';

export default function Player() {
  const [content, setContent] = useState([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const fetchContent = async () => {
      const now = new Date().toISOString();
      console.log("Now:", now);

      const { data, error } = await supabase
        .from('content')
        .select('*')
    

      if (error) {
        console.error("Supabase fetch error:", error.message);
      } else {
        console.log("Fetched content:", data);
      }

      setContent(data || []);
    };

    fetchContent();

    const interval = setInterval(fetchContent, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (content.length === 0) return;

    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % content.length);
    }, 10000);

    return () => clearInterval(interval);
  }, [content]);

  const item = content.length > 0 ? content[current] : null;

  if (!item) {
  return (
    <div className="h-screen bg-black text-white flex flex-col items-center justify-center">
      <img
        src="https://your-logo-url.com/logo.png" // 👈 Optional logo or banner
        alt="No content"
        className="w-48 mb-4"
      />
      <h2 className="text-xl">No scheduled content right now.</h2>
      <p className="text-sm text-gray-400">Please check back later.</p>
    </div>
  );
}

  return (
    <div className="h-screen bg-black text-white flex items-center justify-center">
      <div className="max-w-4xl">
        {item.type === 'image' && (
          <img src={item.media_url} alt={item.title} className="max-h-[80vh]" />
        )}
        {item.type === 'video' && (
          <video src={item.media_url} controls autoPlay muted className="max-h-[80vh]" />
        )}
        {item.type === 'alert' && (
          <div className="bg-red-600 p-6 rounded">
            <h2 className="text-2xl font-bold">🚨 {item.title}</h2>
            <p>{item.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
