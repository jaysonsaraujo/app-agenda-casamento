import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EventContext = createContext();

const EVENTS_STORAGE_KEY = '@agenda_casamento_events';

export const EventProvider = ({ children }) => {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const saved = await AsyncStorage.getItem(EVENTS_STORAGE_KEY);
      if (saved) setEvents(JSON.parse(saved));
    } catch (error) {
      console.error('Erro ao carregar eventos:', error);
    }
  };

  const saveEvents = async (newEvents) => {
    try {
      await AsyncStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(newEvents));
    } catch (error) {
      console.error('Erro ao salvar eventos:', error);
    }
  };

  const addEvent = async (event) => {
    const newEvent = {
      ...event,
      id: Date.now().toString(),
      completed: false,
    };
    const newEvents = [newEvent, ...events];
    setEvents(newEvents);
    await saveEvents(newEvents);
  };

  const toggleTask = (id) => {
    const updatedEvents = events.map((event) =>
      event.id === id ? { ...event, completed: !event.completed } : event
    );
    setEvents(updatedEvents);
    saveEvents(updatedEvents);
  };

  const removeEvent = (id) => {
    const filteredEvents = events.filter((event) => event.id !== id);
    setEvents(filteredEvents);
    saveEvents(filteredEvents);
  };

  return (
    <EventContext.Provider value={{ events, addEvent, toggleTask, removeEvent }}>
      {children}
    </EventContext.Provider>
  );
};

export default EventContext;
