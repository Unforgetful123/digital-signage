import { useEffect } from 'react';
import pb from '../services/pocketbase';

export default function AlertScheduler() {
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const now = new Date();
        
        // 1. Find all alerts that are still marked as active
        const pendingAlerts = await pb.collection('alerts').getFullList({
          filter: `active = true`,
          requestKey: null
        });

        for (const alert of pendingAlerts) {
          if (!alert.start_time || !alert.end_time) continue;
          
          const startTime = new Date(alert.start_time);
          const endTime = new Date(alert.end_time);
          
          // Grab the displays so we can update them
          const targetDisplays = await pb.collection('displays').getFullList({ requestKey: null });

          // ==========================================
          // SCENARIO A: The alert time has EXPIRED
          // ==========================================
          if (now >= endTime) {
            console.log(`✅ Alert expired, clearing screens: ${alert.message}`);

            for (const display of targetDisplays) {
               if (alert.location === 'Global' || display.location === alert.location) {
                   // Only clear it if this specific alert is currently playing
                   if (display.current_type === 'alert' && display.current_title === alert.message) {
                       await pb.collection('displays').update(display.id, {
                           current_type: 'idle',
                           current_command: null,
                           current_title: null
                       }, { requestKey: null });
                   }
               }
            }

            // Mark the alert as inactive so this loop doesn't run again
            await pb.collection('alerts').update(alert.id, {
                active: false
            }, { requestKey: null });
          } 
          
          // ==========================================
          // SCENARIO B: The alert should be RUNNING
          // ==========================================
          else if (now >= startTime && now < endTime) {
            for (const display of targetDisplays) {
               if (alert.location === 'Global' || display.location === alert.location) {
                   // Only send the command if the TV isn't already playing it (prevents spamming)
                   if (display.current_type !== 'alert' || display.current_title !== alert.message) {
                       console.log(`🚨 Triggering scheduled alert: ${alert.message}`);
                       await pb.collection('displays').update(display.id, {
                           current_type: 'alert',
                           current_command: alert.type,
                           current_title: alert.message
                       }, { requestKey: null });
                   }
               }
            }
          }
          
        }
      } catch (err) {
        console.error("Alert Scheduler error:", err);
      }
    }, 10000); // Checks the clock every 10 seconds

    return () => clearInterval(timer);
  }, []);

  return null; 
}