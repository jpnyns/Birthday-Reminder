import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Calendar } from 'react-native-calendars';

interface Birthday {
  id: string;
  name: string;
  date: Date;
  notificationTime: Date;
}

export default function App() {
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [name, setName] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  useEffect(() => {
    loadBirthdays();
    setupNotifications();
  }, []);

  const setupNotifications = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow notifications to receive birthday reminders');
    }
  };

  const loadBirthdays = async () => {
    try {
      const storedBirthdays = await AsyncStorage.getItem('birthdays');
      if (storedBirthdays) {
        const parsedBirthdays = JSON.parse(storedBirthdays);
        const birthdaysWithDates = parsedBirthdays.map((b: any) => ({
          ...b,
          date: new Date(b.date),
          notificationTime: new Date(b.notificationTime)
        }));
        setBirthdays(birthdaysWithDates);
      }
    } catch (error) {
      console.error('Error loading birthdays:', error);
    }
  };

  const saveBirthdays = async (newBirthdays: Birthday[]) => {
    try {
      await AsyncStorage.setItem('birthdays', JSON.stringify(newBirthdays));
      setBirthdays(newBirthdays);
    } catch (error) {
      console.error('Error saving birthdays:', error);
    }
  };

  const calculateAge = (birthDate: Date) => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const getNextBirthday = (birthDate: Date) => {
    const today = new Date();
    const nextBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
    
    if (nextBirthday < today) {
      nextBirthday.setFullYear(today.getFullYear() + 1);
    }
    
    return nextBirthday;
  };

  const getDaysUntilBirthday = (birthDate: Date) => {
    const nextBirthday = getNextBirthday(birthDate);
    const today = new Date();
    const diffTime = nextBirthday.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const scheduleNotification = async (birthday: Birthday) => {
    const now = new Date();
    const notificationDate = new Date(birthday.date);
    notificationDate.setHours(birthday.notificationTime.getHours());
    notificationDate.setMinutes(birthday.notificationTime.getMinutes());

    if (notificationDate < now) {
      notificationDate.setFullYear(now.getFullYear() + 1);
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Birthday Reminder! 🎉',
        body: `Today is ${birthday.name}'s birthday! They will be ${calculateAge(birthday.date) + 1} years old.`,
      },
      trigger: {
        type: 'timeInterval',
        seconds: Math.floor((notificationDate.getTime() - Date.now()) / 1000),
        repeats: true
      } as Notifications.NotificationTriggerInput,
    });
  };

  const addBirthday = async () => {
    if (!name) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    const newBirthday: Birthday = {
      id: Date.now().toString(),
      name,
      date: selectedDate,
      notificationTime: selectedTime,
    };

    const newBirthdays = [...birthdays, newBirthday];
    await saveBirthdays(newBirthdays);
    await scheduleNotification(newBirthday);

    setName('');
    setSelectedDate(new Date());
    setSelectedTime(new Date());
  };

  const deleteBirthday = async (id: string) => {
    const newBirthdays = birthdays.filter(b => b.id !== id);
    await saveBirthdays(newBirthdays);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString();
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const filteredBirthdays = birthdays.filter(birthday =>
    birthday.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getMarkedDates = () => {
    const marked: any = {};
    birthdays.forEach(birthday => {
      const dateStr = birthday.date.toISOString().split('T')[0];
      marked[dateStr] = { marked: true, dotColor: '#007AFF' };
    });
    return marked;
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.header}>
        <Text style={styles.title}>Birthday Reminder</Text>
        <View style={styles.viewToggle}>
          <TouchableOpacity 
            style={[styles.toggleButton, viewMode === 'list' && styles.activeToggle]} 
            onPress={() => setViewMode('list')}
          >
            <Ionicons name="list" size={24} color={viewMode === 'list' ? '#fff' : '#007AFF'} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleButton, viewMode === 'calendar' && styles.activeToggle]} 
            onPress={() => setViewMode('calendar')}
          >
            <Ionicons name="calendar" size={24} color={viewMode === 'calendar' ? '#fff' : '#007AFF'} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search birthdays..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {viewMode === 'calendar' ? (
        <Calendar
          style={styles.calendar}
          markedDates={getMarkedDates()}
          theme={{
            todayTextColor: '#007AFF',
            selectedDayBackgroundColor: '#007AFF',
            dotColor: '#007AFF',
          }}
        />
      ) : null}
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Name"
          value={name}
          onChangeText={setName}
        />
        
        <TouchableOpacity 
          style={styles.dateTimeButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text>Birthday Date: {formatDate(selectedDate)}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.dateTimeButton}
          onPress={() => setShowTimePicker(true)}
        >
          <Text>Notification Time: {formatTime(selectedTime)}</Text>
        </TouchableOpacity>

        {(showDatePicker || showTimePicker) && (
          <DateTimePicker
            value={showDatePicker ? selectedDate : selectedTime}
            mode={showDatePicker ? 'date' : 'time'}
            is24Hour={true}
            display="default"
            onChange={(event, selectedValue) => {
              if (Platform.OS === 'android') {
                setShowDatePicker(false);
                setShowTimePicker(false);
              }
              if (selectedValue) {
                if (showDatePicker) {
                  setSelectedDate(selectedValue);
                } else {
                  setSelectedTime(selectedValue);
                }
              }
            }}
          />
        )}

        <TouchableOpacity style={styles.addButton} onPress={addBirthday}>
          <Text style={styles.buttonText}>Add Birthday</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.list}>
        {filteredBirthdays.map((birthday) => (
          <View key={birthday.id} style={styles.birthdayItem}>
            <View style={styles.birthdayInfo}>
              <Text style={styles.name}>{birthday.name}</Text>
              <Text style={styles.date}>Date: {formatDate(birthday.date)}</Text>
              <Text style={styles.date}>Time: {formatTime(birthday.notificationTime)}</Text>
              <Text style={styles.age}>
                Age: {calculateAge(birthday.date)} years old
              </Text>
              <Text style={styles.daysUntil}>
                {getDaysUntilBirthday(birthday.date)} days until next birthday
              </Text>
            </View>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deleteBirthday(birthday.id)}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    padding: 8,
    borderRadius: 6,
  },
  activeToggle: {
    backgroundColor: '#007AFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    padding: 10,
  },
  calendar: {
    marginBottom: 20,
    borderRadius: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
  dateTimeButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  list: {
    flex: 1,
  },
  birthdayItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  birthdayInfo: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  date: {
    color: '#666',
    marginBottom: 2,
  },
  age: {
    color: '#007AFF',
    fontWeight: '500',
    marginTop: 4,
  },
  daysUntil: {
    color: '#FF9500',
    fontWeight: '500',
    marginTop: 2,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    padding: 8,
    borderRadius: 5,
    marginLeft: 10,
  },
  deleteButtonText: {
    color: '#fff',
  },
}); 