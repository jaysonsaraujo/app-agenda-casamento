import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const HomeScreen = () => {
  const navigation = useNavigation();

  const handleNavigateToTasks = () => {
    navigation.navigate('Tasks');
  };

  const handleNavigateToSuppliers = () => {
    navigation.navigate('Suppliers');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Bem-vindo à Agenda de Casamento</Text>
        <Text style={styles.subtitle}>Organize o dia dos seus sonhos com facilidade</Text>
      </View>
      
      <View style={styles.content}>
        <TouchableOpacity style={styles.card} onPress={handleNavigateToTasks}>
          <Text style={styles.cardTitle}>Minhas Tarefas</Text>
          <Text style={styles.cardDescription}>Adicione e gerencie lembretes para o grande dia</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.card} onPress={handleNavigateToSuppliers}>
          <Text style={styles.cardTitle}>Fornecedores</Text>
          <Text style={styles.cardDescription}>Lista de contatos para buffets, fotógrafos e mais</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    paddingTop: 50,  // Padding fixo para safe area iOS
    paddingBottom: 20,
    alignItems: 'center',  // Centralização horizontal corrigida
    backgroundColor: '#FF69B4',  // Gradiente romântico no topo
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',  // Garante centralização do texto
    marginHorizontal: 20,  // Evita overflow em telas pequenas
  },
  subtitle: {
    fontSize: 16,
    color: '#FFF',
    textAlign: 'center',
    marginTop: 5,
    opacity: 0.9,
  },
  content: {
    padding: 20,
  },
  card: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',  // Sombra sutil para elevação
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,  // Para Android
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
  },
});

export default HomeScreen;
