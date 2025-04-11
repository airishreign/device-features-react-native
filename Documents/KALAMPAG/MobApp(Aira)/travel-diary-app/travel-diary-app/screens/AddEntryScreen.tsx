// screens/AddEntryScreen.js
import React, { useState, useEffect } from 'react';
import { View, Button, Image, Text, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { saveName, getName, clearName } from '../utils/storage';
import EntryItem from '../components/EntryItem';
import useColorScheme from '../hooks/useColorScheme';

const AddEntryScreen = () => {
  const [name, setName] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState(null);
  const { colorScheme, toggleColorScheme } = useColorScheme();

  const takePicture = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Camera permission is required to take pictures.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({ quality: 1 });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const getCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      alert('Location permission is required.');
      return;
    }

    const locationData = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    setLocation(locationData.coords);

    const address = await Location.reverseGeocodeAsync({
      latitude: locationData.coords.latitude,
      longitude: locationData.coords.longitude,
    });
    setAddress(`${address[0].name}, ${address[0].city}, ${address[0].region}`);
  };

  useEffect(() => {
    const loadName = async () => {
      const storedName = await getName();
      setName(storedName);
    };

    loadName();
  }, []);

  const saveEntry = async () => {
    if (name && imageUri && address) {
      // Save entry logic (could be local storage or API)
      alert('Entry saved!');
      await saveName(name);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colorScheme === 'dark' ? '#000' : '#fff' }]}>
      <Text style={{ color: colorScheme === 'dark' ? '#fff' : '#000' }}>Name: {name}</Text>
      <Button title="Take Picture" onPress={takePicture} />
      {imageUri && <Image source={{ uri: imageUri }} style={styles.image} />}
      <Button title="Get Current Location" onPress={getCurrentLocation} />
      {address && <Text style={{ color: colorScheme === 'dark' ? '#fff' : '#000' }}>{address}</Text>}
      <Button title="Save Entry" onPress={saveEntry} />
      <Button title="Toggle Theme" onPress={toggleColorScheme} />
      <EntryItem name={name} imageUri={imageUri} address={address} onRemove={() => setImageUri(null)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  image: {
    width: 200,
    height: 200,
    marginTop: 20,
  },
});

export default AddEntryScreen;
