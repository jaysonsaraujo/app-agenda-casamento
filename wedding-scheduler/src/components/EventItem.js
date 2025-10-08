import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';

export default function EventItem({ event, onToggle, onDelete }) {
  const handleDelete = () => {
    Alert.alert(
      'Excluir Evento',
      `Deseja excluir "${event.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: onDelete },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.content}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, event.completed && styles.checkboxCompleted]}>
          {event.completed && <View style={styles.checkmark} />}
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, event.completed && styles.completedText]}>
            {event.title}
          </Text>
          <Text style={[styles.date, event.completed && styles.completedText]}>
            {event.date} {event.time}
          </Text>
          {event.description ? (
            <Text style={[styles.description, event.completed && styles.completedText]}>
              {event.description}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={handleDelete}
        activeOpacity={0.7}
      >
        <Text style={styles.deleteButtonText}>🗑️</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginVertical: 6,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 10,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxCompleted: {
    borderColor: '#007AFF',
    backgroundColor: '#e6f2ff',
  },
  checkmark: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  date: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  description: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
    lineHeight: 18,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#aaa',
  },
  deleteButton: {
    marginLeft: 12,
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: 18,
  },
});
