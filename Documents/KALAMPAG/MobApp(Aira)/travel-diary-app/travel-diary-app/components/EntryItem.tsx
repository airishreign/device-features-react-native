// components/EntryItem.js
import React from 'react';
import { View, Text, Image, StyleSheet, Button } from 'react-native';

const EntryItem = ({ name, imageUri, address, onRemove }) => {
  return (
    <View style={styles.container}>
      {imageUri && <Image source={{ uri: imageUri }} style={styles.image} />}
      <Text>{name}</Text>
      <Text>{address}</Text>
      <Button title="Remove" onPress={onRemove} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 10,
  },
  image: {
    width: 200,
    height: 200,
    marginBottom: 10,
  },
});

export default EntryItem;
