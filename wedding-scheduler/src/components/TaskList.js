import React from 'react';
import { FlatList, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const TaskList = ({ tasks, onToggleTask }) => {
  const renderItem = ({ item, index }) => (
    <TouchableOpacity 
      style={styles.taskItem} 
      onPress={() => onToggleTask(item.id)}
      activeOpacity={0.7}  // Feedback de press
    >
      <View style={styles.checkbox}>
        <Text style={[styles.checkboxText, item.completed && styles.completed]}>{item.completed ? '✓' : '○'}</Text>
      </View>
      <Text style={[styles.taskText, item.completed && styles.completedText]}>
        {item.title}
      </Text>
    </TouchableOpacity>
  );

  const renderSeparator = () => <View style={styles.separator} />;

  return (
    <FlatList
      data={tasks}
      renderItem={renderItem}
      keyExtractor={(item) => item.id.toString()}
      ItemSeparatorComponent={renderSeparator}  // Espaçamento fixo corrigido
      style={styles.list}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  taskItem: {
    backgroundColor: '#FFF',
    padding: 16,
    marginHorizontal: 10,
    borderRadius: 8,  // Bordas suaves corrigidas
    marginVertical: 4,  // Espaçamento vertical base
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',  // Sombra sutil
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,  // Para Android
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF69B4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxText: {
    fontSize: 14,
    color: '#FF69B4',
    fontWeight: 'bold',
  },
  completed: {
    color: '#4CAF50',
  },
  taskText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  separator: {
    height: 8,  // Espaçamento fixo entre itens (corrigido de irregular)
    backgroundColor: 'transparent',
  },
});

export default TaskList;
