import React from 'react';
import { View, Text, FlatList, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SavedPhotosScreen = ({ entries, toggleFavorite, styles, renderEmptyComponent }) => {
  const renderEntry = ({ item }) => (
    <View style={styles.entryContainer}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.imageUri }} style={styles.image} />
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => toggleFavorite(item.id)}
        >
          <Ionicons
            name={item.isFavorite ? 'heart' : 'heart-outline'}
            size={24}
            color={item.isFavorite ? '#FF5252' : '#ffffff'}
          />
        </TouchableOpacity>
      </View>
      {item.caption && <Text style={styles.captionText}>{item.caption}</Text>}
      <Text style={styles.addressText}>{item.address}</Text>
    </View>
  );

  return (
    <View style={styles.tabContent}>
      <Text style={styles.heading}>Saved Photos</Text>
      <FlatList
        data={entries}
        renderItem={renderEntry}
        keyExtractor={(item) => item.id}
        style={styles.entriesList}
        ListEmptyComponent={renderEmptyComponent}
      />
    </View>
  );
};

export default SavedPhotosScreen;