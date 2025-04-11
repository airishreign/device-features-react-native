import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, Button, StyleSheet, Modal, TouchableOpacity, Alert, TextInput } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Function to send notification that works with Expo Go
const sendLocalNotification = async (title, body) => {
  // Check if we have permission first
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // If we don't have permission, ask for it
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  // Only proceed if permissions granted
  if (finalStatus === 'granted') {
    // Schedule the notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: title,
        body: body,
      },
      trigger: null, // null means show immediately
    });
  } else {
    // If permissions not granted, use Alert as fallback
    Alert.alert(title, body);
  }
};

const HomeScreen = () => {
  const [entries, setEntries] = useState([]);
  const [imageUri, setImageUri] = useState(null);
  const [address, setAddress] = useState('');
  const [caption, setCaption] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState(null);
  const [currentTab, setCurrentTab] = useState('home'); // 'home', 'saved', or 'favorites'
  const [mostRecentPhoto, setMostRecentPhoto] = useState(null);

  // Register for notification permissions when component mounts
  useEffect(() => {
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Push notifications are required for the best experience'
        );
      }
    })();
  }, []);

  // Update most recent photo whenever entries change
  useEffect(() => {
    if (entries.length > 0) {
      setMostRecentPhoto(entries[entries.length - 1]);
    } else {
      setMostRecentPhoto(null); // Reset if no entries left
    }
  }, [entries]);

  // Function to take a picture
  const takePicture = async () => {
    // Show notification when opening camera
    await sendLocalNotification('Camera Opening', 'Preparing to take a photo...');
    
    // Proceed with camera access after notification
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is required to take pictures.');
        return;
      }
      
      // Send notification when camera is active
      await sendLocalNotification('Camera Ready', 'Camera is now active');
      
      const result = await ImagePicker.launchCameraAsync({ quality: 1 });
      if (!result.canceled) {
        setImageUri(result.assets[0].uri);
        setCaption(''); // Reset caption for new photo
        await sendLocalNotification('Photo Captured', 'Photo successfully captured!');
        getCurrentLocation(); // Get location after taking the picture
      } else {
        await sendLocalNotification('Photo Cancelled', 'Photo capture was cancelled');
      }
    } catch (error) {
      console.error('Camera error:', error);
      await sendLocalNotification('Camera Error', 'Failed to access camera');
    }
  };

  // Function to get current location and reverse geocode it to address
  const getCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Location permission is required.');
      return;
    }
    
    try {
      await sendLocalNotification('Getting Location', 'Retrieving your current location...');
      
      const locationData = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      const address = await Location.reverseGeocodeAsync({
        latitude: locationData.coords.latitude,
        longitude: locationData.coords.longitude,
      });
      
      // Format the address to a readable string
      if (address && address.length > 0) {
        setAddress(`${address[0].name || ''}, ${address[0].city || ''}, ${address[0].region || ''}`);
        await sendLocalNotification('Location Found', 'Your location has been identified');
      } else {
        setAddress('Unknown location');
        await sendLocalNotification('Location Issue', 'Could not determine specific address');
      }
      
      // Show the custom dialog with the photo directly
      setShowConfirmDialog(true);
    } catch (error) {
      console.error('Error getting location:', error);
      setAddress('Unable to determine location');
      await sendLocalNotification('Location Error', 'Could not access your location');
      setShowConfirmDialog(true); // Still show dialog to save the photo
    }
  };

  // Function to cancel saving the entry
  const cancelSaveEntry = async () => {
    await sendLocalNotification('Entry Cancelled', 'The entry has been discarded.');
    setImageUri(null); // Reset the image URI
    setAddress(''); // Reset the address
    setCaption(''); // Reset the caption
    setShowConfirmDialog(false); // Hide the dialog
  };

  // Function to save the entry
  const saveEntry = async () => {
    if (imageUri) {
      // Create new entry with current timestamp as ID
      const newEntry = { 
        id: Date.now().toString(), 
        imageUri, 
        address: address || 'No location data',
        caption: caption || '', // Include caption in the entry
        isFavorite: false // Adding favorite flag
      };
      
      // Add the new entry to the entries array
      setEntries((prevEntries) => [...prevEntries, newEntry]);
      
      // Update most recent photo immediately
      setMostRecentPhoto(newEntry);
      
      // Send detailed notification when photo is saved
      await sendLocalNotification(
        'Photo Saved Successfully', 
        `Your photo "${caption || 'No caption'}" at ${address || 'unknown location'} has been saved!`
      );
      
      setImageUri(null); // Reset the image after saving
      setAddress(''); // Reset the address
      setCaption(''); // Reset the caption
      setShowConfirmDialog(false); // Hide the dialog
    }
  };

  // Function to toggle favorite status of a photo
  const toggleFavorite = async (id) => {
    setEntries(prevEntries => 
      prevEntries.map(entry => {
        if (entry.id === id) {
          const newFavoriteStatus = !entry.isFavorite;
          
          // Send notification about the favorite status change
          sendLocalNotification(
            newFavoriteStatus ? 'Added to Favorites' : 'Removed from Favorites',
            newFavoriteStatus ? 'Photo has been added to your favorites!' : 'Photo has been removed from your favorites.'
          );
          
          return { ...entry, isFavorite: newFavoriteStatus };
        }
        return entry;
      })
    );
  };

  // Function to prompt for deletion of a photo
  const promptDeletePhoto = (photo) => {
    setPhotoToDelete(photo);
    setShowDeleteConfirm(true);
  };

  // Function to confirm and delete a photo
  const deletePhoto = async () => {
    if (photoToDelete) {
      // Remove the photo from the entries array
      setEntries(prevEntries => prevEntries.filter(entry => entry.id !== photoToDelete.id));
      
      // Send notification about the photo deletion
      await sendLocalNotification(
        'Photo Deleted', 
        'The selected photo has been permanently removed.'
      );
      
      // Reset state and close the modal
      setPhotoToDelete(null);
      setShowDeleteConfirm(false);
    }
  };

  // Function to cancel photo deletion
  const cancelDelete = () => {
    setPhotoToDelete(null);
    setShowDeleteConfirm(false);
  };

  // Function to render each entry in the list
  const renderEntry = ({ item }) => (
    <View style={styles.entryContainer}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.imageUri }} style={styles.image} />
        <TouchableOpacity 
          style={styles.favoriteButton}
          onPress={() => toggleFavorite(item.id)}
        >
          <Ionicons 
            name={item.isFavorite ? "heart" : "heart-outline"} 
            size={24} 
            color={item.isFavorite ? "#FF5252" : "#ffffff"} 
          />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => promptDeletePhoto(item)}
        >
          <Ionicons 
            name="trash-outline" 
            size={24} 
            color="#ffffff" 
          />
        </TouchableOpacity>
      </View>
      {item.caption ? (
        <Text style={styles.captionText}>{item.caption}</Text>
      ) : null}
      <Text style={styles.addressText}>{item.address}</Text>
    </View>
  );

  // Function to render empty component when no entries
  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        {currentTab === 'favorites' ? 'No Favorite Photos' : 'No Saved Photos'}
      </Text>
    </View>
  );

  // Render Home tab content
  const renderHomeContent = () => (
    <View style={styles.tabContent}>
      <Text style={styles.heading}>Home Screen</Text>
      
      {/* Recent Photo Section */}
      <View style={styles.recentPhotoContainer}>
        <Text style={styles.recentPhotoTitle}>Recent Photo</Text>
        {mostRecentPhoto ? (
          <TouchableOpacity 
            style={styles.recentPhotoCard}
            onPress={() => setCurrentTab('saved')} // Navigate to saved photos when tapping the recent photo
          >
            <View style={styles.imageContainer}>
              <Image 
                source={{ uri: mostRecentPhoto.imageUri }} 
                style={styles.recentPhotoImage} 
                // Add error handling for image loading
                onError={() => {
                  console.log('Error loading image');
                  sendLocalNotification('Image Error', 'Failed to load the recent photo');
                }}
              />
              <TouchableOpacity 
                style={styles.favoriteButton}
                onPress={() => toggleFavorite(mostRecentPhoto.id)}
              >
                <Ionicons 
                  name={mostRecentPhoto.isFavorite ? "heart" : "heart-outline"} 
                  size={24} 
                  color={mostRecentPhoto.isFavorite ? "#FF5252" : "#ffffff"} 
                />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={() => promptDeletePhoto(mostRecentPhoto)}
              >
                <Ionicons 
                  name="trash-outline" 
                  size={24} 
                  color="#ffffff" 
                />
              </TouchableOpacity>
            </View>
            {mostRecentPhoto.caption ? (
              <Text style={styles.recentPhotoCaptionText}>{mostRecentPhoto.caption}</Text>
            ) : null}
            <Text style={styles.recentPhotoAddress}>{mostRecentPhoto.address}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.noRecentPhotoContainer}>
            <Ionicons name="images-outline" size={48} color="#aaa" />
            <Text style={styles.noRecentPhotoText}>No recent photos</Text>
            <Text style={styles.takePhotoPrompt}>Take a picture to get started</Text>
          </View>
        )}
      </View>
      
      <View style={styles.takePhotoButtonContainer}>
        <Button 
          title="Take Picture" 
          onPress={takePicture} 
          color="#4CAF50" 
        />
      </View>
    </View>
  );

  // Render Saved Photos tab content
  const renderSavedContent = () => (
    <View style={styles.tabContent}>
      <Text style={styles.heading}>Saved Photos</Text>
      <FlatList
        data={entries}
        renderItem={renderEntry}
        keyExtractor={(item) => item.id}
        style={styles.entriesList}
        ListEmptyComponent={renderEmptyComponent}
      />
      
      {/* Floating Action Button (+ button) */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={takePicture}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  // Render Favorites tab content
  const renderFavoritesContent = () => (
    <View style={styles.tabContent}>
      <Text style={styles.heading}>Favorite Photos</Text>
      <FlatList
        data={entries.filter(entry => entry.isFavorite)}
        renderItem={renderEntry}
        keyExtractor={(item) => item.id}
        style={styles.entriesList}
        ListEmptyComponent={renderEmptyComponent}
      />
    </View>
  );

  // Render content based on current tab
  const renderContent = () => {
    switch(currentTab) {
      case 'home':
        return renderHomeContent();
      case 'saved':
        return renderSavedContent();
      case 'favorites':
        return renderFavoritesContent();
      default:
        return renderHomeContent();
    }
  };

  return (
    <View style={styles.container}>
      {/* Main Content Area - conditionally render based on current tab */}
      {renderContent()}

      {/* Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity 
          style={[styles.navButton, currentTab === 'home' && styles.activeNavButton]} 
          onPress={() => setCurrentTab('home')}
        >
          <Ionicons 
            name="home" 
            size={24} 
            color={currentTab === 'home' ? '#4CAF50' : '#777'} 
          />
          <Text style={[styles.navText, currentTab === 'home' && styles.activeNavText]}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navButton, currentTab === 'saved' && styles.activeNavButton]} 
          onPress={() => setCurrentTab('saved')}
        >
          <Ionicons 
            name="images" 
            size={24} 
            color={currentTab === 'saved' ? '#4CAF50' : '#777'} 
          />
          <Text style={[styles.navText, currentTab === 'saved' && styles.activeNavText]}>Saved</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.navButton, currentTab === 'favorites' && styles.activeNavButton]} 
          onPress={() => setCurrentTab('favorites')}
        >
          <Ionicons 
            name="heart" 
            size={24} 
            color={currentTab === 'favorites' ? '#FF5252' : '#777'} 
          />
          <Text style={[styles.navText, currentTab === 'favorites' && styles.activeNavText]}>Favorites</Text>
        </TouchableOpacity>
      </View>

      {/* Custom confirmation dialog with image preview and caption field */}
      <Modal
        transparent={true}
        visible={showConfirmDialog}
        animationType="fade"
        onRequestClose={() => setShowConfirmDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Save Entry</Text>
            <Text style={styles.modalMessage}>Do you want to save this photo?</Text>
            
            {imageUri && (
              <Image 
                source={{ uri: imageUri }} 
                style={styles.modalImage} 
                onError={() => {
                  console.log('Error loading preview image');
                  sendLocalNotification('Preview Error', 'Failed to load image preview');
                }}
              />
            )}
            
            {/* Caption input field */}
            <View style={styles.captionInputContainer}>
              <Text style={styles.captionLabel}>Add a caption:</Text>
              <TextInput
                style={styles.captionInput}
                value={caption}
                onChangeText={(text) => {
                  // Limit to 50 characters
                  if (text.length <= 50) {
                    setCaption(text);
                  }
                }}
                placeholder="Enter caption (max 50 characters)"
                maxLength={50}
              />
              <Text style={styles.characterCount}>{caption.length}/50</Text>
            </View>
            
            {address && <Text style={styles.modalAddress}>{address}</Text>}
            
            <View style={styles.modalButtonContainer}>
              {/* Yes on left, No on right */}
              <Button title="Yes" onPress={saveEntry} color="#4CAF50" />
              <View style={styles.buttonSpacer} />
              <Button title="No" onPress={cancelSaveEntry} color="#FF5252" />
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        transparent={true}
        visible={showDeleteConfirm}
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Delete Photo</Text>
            <Text style={styles.modalMessage}>Are you sure you want to delete this photo?</Text>
            
            {photoToDelete && (
              <Image 
                source={{ uri: photoToDelete.imageUri }} 
                style={styles.modalImage} 
                onError={() => {
                  console.log('Error loading delete preview image');
                }}
              />
            )}
            
            {photoToDelete && photoToDelete.caption && (
              <Text style={styles.modalCaption}>{photoToDelete.caption}</Text>
            )}
            
            <View style={styles.modalButtonContainer}>
              <Button title="Cancel" onPress={cancelDelete} color="#4CAF50" />
              <View style={styles.buttonSpacer} />
              <Button title="Delete" onPress={deletePhoto} color="#FF5252" />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  tabContent: {
    flex: 1,
    padding: 20,
    paddingTop: 40,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  // Recent Photo Styles
  recentPhotoContainer: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  recentPhotoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  recentPhotoCard: {
    alignItems: 'center',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    alignItems: 'center',
  },
  recentPhotoImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(255,0,0,0.5)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentPhotoCaptionText: {
    textAlign: 'center',
    fontWeight: '500',
    color: '#333',
    fontSize: 14,
    marginBottom: 5,
  },
  recentPhotoAddress: {
    textAlign: 'center',
    color: '#555',
    fontSize: 14,
  },
  noRecentPhotoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9f9f9',
    padding: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    borderStyle: 'dashed',
  },
  noRecentPhotoText: {
    marginTop: 10,
    color: '#888',
    fontSize: 16,
    fontStyle: 'italic',
  },
  takePhotoPrompt: {
    marginTop: 5,
    color: '#aaa',
    fontSize: 14,
  },
  takePhotoButtonContainer: {
    marginTop: 10,
  },
  entriesList: {
    flex: 1,
  },
  entryContainer: {
    marginVertical: 10,
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  image: {
    width: 200,
    height: 200,
    marginBottom: 10,
    borderRadius: 5,
  },
  captionText: {
    textAlign: 'center',
    fontWeight: '500',
    color: '#333',
    fontSize: 14,
    marginBottom: 5,
  },
  addressText: {
    textAlign: 'center',
    color: '#555',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    borderStyle: 'dashed',
    backgroundColor: '#f9f9f9',
    marginVertical: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    fontStyle: 'italic',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalMessage: {
    marginBottom: 15,
    textAlign: 'center',
  },
  modalImage: {
    width: 200,
    height: 200,
    marginBottom: 10,
    borderRadius: 5,
  },
  modalCaption: {
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: '500',
  },
  captionInputContainer: {
    width: '100%',
    marginBottom: 15,
  },
  captionLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 5,
    color: '#333',
  },
  captionInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    paddingHorizontal: 10,
    backgroundColor: '#f9f9f9',
    width: '100%',
  },
  characterCount: {
    alignSelf: 'flex-end',
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  modalAddress: {
    marginBottom: 15,
    textAlign: 'center',
    color: '#555',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  buttonSpacer: {
    width: 20,
  },
  // Navigation Bar Styles
  navBar: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  activeNavButton: {
    borderTopWidth: 2,
    borderTopColor: '#4CAF50',
  },
  navText: {
    marginTop: 4,
    fontSize: 12,
    color: '#777',
  },
  activeNavText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  // Floating Action Button Style
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    right: 20,
    bottom: 20,
    backgroundColor: '#4CAF50',
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  }
});

export default HomeScreen;