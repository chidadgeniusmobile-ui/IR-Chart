import React, { useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import {
  ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Platform,
  SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput,
  TouchableOpacity, View
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

const BLUE = '#1769E0';
const LIGHT = '#F3F7FF';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('login');
  const [authMethod, setAuthMethod] = useState('email');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [tab, setTab] = useState('Home');
  const [posts, setPosts] = useState([]);
  const [caption, setCaption] = useState('');
  const [pickedImage, setPickedImage] = useState(null);
  const [people, setPeople] = useState([]);
  const [activePerson, setActivePerson] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [myProfile, setMyProfile] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);
useEffect(() => {
  async function handleAuthUrl(url) {
    if (!url) return;

    const parsed = Linking.parse(url);
    const code = parsed.queryParams?.code;

    if (typeof code === 'string') {
      const { error } =
        await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        Alert.alert(
          'Uthibitishaji umeshindikana',
          'Link inaweza kuwa imekwisha muda. Omba link mpya ya uthibitishaji.'
        );
      }
    }
  }

  const subscription = Linking.addEventListener('url', ({ url }) => {
    handleAuthUrl(url);
  });

  Linking.getInitialURL().then(handleAuthUrl);

  return () => subscription.remove();
}, []);
  useEffect(() => {
    if (session?.user) {
      ensureProfile();
      loadPosts();
      loadPeople();
    }
  }, [session]);

  useEffect(() => {
    if (activePerson && session?.user) loadMessages();
  }, [activePerson, session]);

  async function ensureProfile() {
    const user = session?.user;
    if (!user) return;
    const name = user.user_metadata?.full_name || user.email?.split('@')[0] || user.phone || 'IR-Chart User';
    await supabase.from('profiles').upsert({
      id: user.id, full_name: name, username: (user.email?.split('@')[0] || user.phone || 'user').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 24)
    }, { onConflict: 'id', ignoreDuplicates: true });
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    setMyProfile(data);
  }

  async function authenticate() {
    
async function authenticate() {
  if (!identifier.trim() || !password) {
    return Alert.alert(
      'Taarifa zinahitajika',
      'Jaza email/namba ya simu na password.'
    );
  }

  if (mode === 'signup' && !fullName.trim()) {
    return Alert.alert('Jina linahitajika', 'Andika jina lako kamili.');
  }

  const key = identifier.trim();
  let result;

  try {
    if (mode === 'signup') {
      const options = {
        data: { full_name: fullName.trim() },
        ...(authMethod === 'email'
          ? { emailRedirectTo: 'irchart://auth/callback' }
          : {}),
      };

      result = authMethod === 'email'
        ? await supabase.auth.signUp({
            email: key,
            password,
            options,
          })
        : await supabase.auth.signUp({
            phone: key,
            password,
            options,
          });

      if (!result.error) {
        Alert.alert(
          'Usajili umetumwa',
          authMethod === 'email'
            ? 'Fungua email yako na uthibitishe akaunti.'
            : 'Angalia SMS yako kwa maelekezo ya uthibitishaji.'
        );
      }
    } else {
      result = authMethod === 'email'
        ? await supabase.auth.signInWithPassword({
            email: key,
            password,
          })
        : await supabase.auth.signInWithPassword({
            phone: key,
            password,
          });
    }

    if (result.error) {
      Alert.alert('Imeshindikana', result.error.message);
    } else if (result.data?.session) {
      setSession(result.data.session);
    }
  } catch (error) {
    Alert.alert(
      'Hitilafu',
      error.message || 'Jaribu tena baada ya muda.'
    );
  }
}
};

  result = authMethod === 'email'
    ? await supabase.auth.signUp({
        email: key,
        password,
        options,
      })
    : await supabase.auth.signUp({
        phone: key,
        password,
        options,
      });

  if (!result.error) {
    Alert.alert(
      'Usajili umetumwa',
      authMethod === 'email'
        ? 'Fungua email yako na uthibitishe akaunti.'
        : 'Angalia SMS yako kwa maelekezo ya uthibitishaji.'
    );
  }
} else {
  result = authMethod === 'email'
    ? await supabase.auth.signInWithPassword({
        email: key,
        password,
      })
    : await supabase.auth.signInWithPassword({
        phone: key,
        password,
      });
}
      if (!result.error) {
        Alert.alert('Usajili umetumwa', authMethod === 'email'
          ? 'Kama email confirmation imewashwa, fungua email yako uthibitishe akaunti.'
          : 'Kama uthibitisho wa SMS umewekwa, ingiza OTP utakayotumiwa. Hakikisha SMS provider imesanidiwa Supabase.');
      }
    } else {
      result = authMethod === 'email'
        ? await supabase.auth.signInWithPassword({ email: key, password })
        : await supabase.auth.signInWithPassword({ phone: key, password });
    }
    if (result.error) Alert.alert('Imeshindikana', result.error.message);
    else if (result.data?.session) setSession(result.data.session);
  }

  async function loadPosts() {
    const { data, error } = await supabase.from('posts').select('id, user_id, caption, image_url, created_at, profiles(full_name, username)').order('created_at', { ascending: false }).limit(50);
    if (error) console.log(error.message); else setPosts(data || []);
  }

  async function loadPeople() {
    const { data, error } = await supabase.from('profiles').select('id, full_name, username').neq('id', session.user.id).order('full_name').limit(100);
    if (error) console.log(error.message); else setPeople(data || []);
  }

  async function chooseImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert('Ruhusa inahitajika', 'Ruhusu IR-Chart kufikia picha zako.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 });
    if (!result.canceled) setPickedImage(result.assets[0]);
  }

  async function publishPost() {
    if (!caption.trim() && !pickedImage) return Alert.alert('Post tupu', 'Andika maelezo au chagua picha.');
    let imageUrl = null;
    if (pickedImage) {
      try {
        const response = await fetch(pickedImage.uri);
        const blob = await response.blob();
        const ext = pickedImage.uri.split('.').pop()?.split('?')[0] || 'jpg';
        const path = `${session.user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('post-images').upload(path, blob, {
          contentType: pickedImage.mimeType || 'image/jpeg', upsert: false
        });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('post-images').getPublicUrl(path);
        imageUrl = data.publicUrl;
      } catch (e) {
        return Alert.alert('Picha haijapakiwa', e.message || 'Jaribu tena.');
      }
    }
    const { error } = await supabase.from('posts').insert({ user_id: session.user.id, caption: caption.trim(), image_url: imageUrl });
    if (error) return Alert.alert('Post haijatumwa', error.message);
    setCaption(''); setPickedImage(null); await loadPosts();
    Alert.alert('Imefanikiwa', 'Post yako imechapishwa.');
  }

  async function loadMessages() {
    const me = session.user.id, other = activePerson.id;
    const { data, error } = await supabase.from('messages').select('id, sender_id, receiver_id, body, created_at').or(`and(sender_id.eq.${me},receiver_id.eq.${other}),and(sender_id.eq.${other},receiver_id.eq.${me})`).order('created_at', { ascending: true }).limit(200);
    if (error) console.log(error.message); else setMessages(data || []);
  }

  async function sendMessage() {
    if (!messageText.trim() || !activePerson) return;
    const body = messageText.trim();
    setMessageText('');
    const { error } = await supabase.from('messages').insert({ sender_id: session.user.id, receiver_id: activePerson.id, body });
    if (error) { setMessageText(body); return Alert.alert('Ujumbe haujatumwa', error.message); }
    await loadMessages();
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null); setActivePerson(null); setTab('Home');
  }

  if (loading) return <Center><ActivityIndicator size="large" color={BLUE} /><Text style={styles.muted}>Inafungua IR-Chart...</Text></Center>;

  if (!session) return (
    <SafeAreaView style={styles.authScreen}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.logoCircle}><Text style={styles.logoText}>IR</Text></View>
      <Text style={styles.brand}>IR-Chart</Text>
      <Text style={styles.tagline}>Ungana. Shiriki. Chat.</Text>
      <View style={styles.authCard}>
        <Text style={styles.heading}>{mode === 'login' ? 'Karibu tena' : 'Fungua akaunti'}</Text>
        {mode === 'signup' && <TextInput style={styles.input} placeholder="Jina kamili" value={fullName} onChangeText={setFullName} />}
        <View style={styles.switchRow}>
          <TouchableOpacity onPress={() => setAuthMethod('email')} style={[styles.methodButton, authMethod === 'email' && styles.methodActive]}><Text style={[styles.methodText, authMethod === 'email' && styles.methodTextActive]}>Email</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setAuthMethod('phone')} style={[styles.methodButton, authMethod === 'phone' && styles.methodActive]}><Text style={[styles.methodText, authMethod === 'phone' && styles.methodTextActive]}>Simu</Text></TouchableOpacity>
        </View>
        <TextInput style={styles.input} placeholder={authMethod === 'email' ? 'Email address' : 'Namba ya simu, mfano +2557...'} value={identifier} onChangeText={setIdentifier} autoCapitalize="none" keyboardType={authMethod === 'email' ? 'email-address' : 'phone-pad'} />
        <TextInput style={styles.input} placeholder="Password (angalau herufi 6)" value={password} onChangeText={setPassword} secureTextEntry />
        <TouchableOpacity style={styles.primaryButton} onPress={authenticate}><Text style={styles.primaryText}>{mode === 'login' ? 'Ingia' : 'Jisajili'}</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}><Text style={styles.linkText}>{mode === 'login' ? 'Huna akaunti? Jisajili' : 'Una akaunti? Ingia'}</Text></TouchableOpacity>
      </View>
      <Text style={styles.smallNote}>Kwa kuendelea, kubali kutumia IR-Chart kwa heshima na usalama.</Text>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.app}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <View><Text style={styles.headerBrand}>IR-Chart</Text><Text style={styles.headerSub}>Ungana na watu</Text></View>
        <TouchableOpacity style={styles.avatarMini} onPress={() => setTab('Profile')}><Text style={styles.avatarMiniText}>{(myProfile?.full_name || 'I').slice(0,1).toUpperCase()}</Text></TouchableOpacity>
      </View>

      {tab === 'Home' && (
        <ScrollView contentContainerStyle={styles.feed}>
          <View style={styles.composeCard}>
            <Text style={styles.cardTitle}>Shiriki kitu kipya</Text>
            <TextInput style={[styles.input, styles.captionInput]} placeholder="Una mawazo gani?" value={caption} onChangeText={setCaption} multiline />
            {pickedImage && <Image source={{ uri: pickedImage.uri }} style={styles.previewImage} />}
            <View style={styles.composeActions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={chooseImage}><Text style={styles.secondaryText}>＋ Picha</Text></TouchableOpacity>
              <TouchableOpacity style={styles.primarySmall} onPress={publishPost}><Text style={styles.primaryText}>Post</Text></TouchableOpacity>
            </View>
          </View>
          {posts.map(post => <View key={post.id} style={styles.postCard}>
            <View style={styles.postAuthor}><View style={styles.avatar}><Text style={styles.avatarText}>{(post.profiles?.full_name || 'U').slice(0,1).toUpperCase()}</Text></View><View style={{flex:1}}><Text style={styles.authorName}>{post.profiles?.full_name || 'IR-Chart User'}</Text><Text style={styles.muted}>@{post.profiles?.username || 'user'}</Text></View></View>
            {!!post.caption && <Text style={styles.postCaption}>{post.caption}</Text>}
            {!!post.image_url && <Image source={{ uri: post.image_url }} style={styles.postImage} resizeMode="cover" />}
            <Text style={styles.postDate}>{new Date(post.created_at).toLocaleString()}</Text>
          </View>)}
          {posts.length === 0 && <Text style={styles.empty}>Hakuna post bado. Kuwa wa kwanza kushiriki!</Text>}
        </ScrollView>
      )}

      {tab === 'Chat' && !activePerson && (
        <View style={styles.page}>
          <Text style={styles.heading}>Inbox</Text>
          <Text style={styles.muted}>Chagua mtu kuanza mazungumzo.</Text>
          <FlatList data={people} keyExtractor={item => item.id} ListEmptyComponent={<Text style={styles.empty}>Hakuna watumiaji wengine bado.</Text>} renderItem={({item}) => <TouchableOpacity style={styles.personRow} onPress={() => setActivePerson(item)}><View style={styles.avatar}><Text style={styles.avatarText}>{(item.full_name || 'U').slice(0,1).toUpperCase()}</Text></View><View><Text style={styles.authorName}>{item.full_name || 'IR-Chart User'}</Text><Text style={styles.muted}>@{item.username || 'user'}</Text></View><Text style={styles.chevron}>›</Text></TouchableOpacity>} />
          <TouchableOpacity style={styles.secondaryButton} onPress={loadPeople}><Text style={styles.secondaryText}>Refresh users</Text></TouchableOpacity>
        </View>
      )}

      {tab === 'Chat' && activePerson && (
        <KeyboardAvoidingView style={styles.chatPage} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={styles.chatHeader} onPress={() => setActivePerson(null)}><Text style={styles.chevron}>‹</Text><View><Text style={styles.authorName}>{activePerson.full_name}</Text><Text style={styles.muted}>@{activePerson.username}</Text></View></TouchableOpacity>
          <FlatList style={{flex:1}} contentContainerStyle={{padding:14}} data={messages} keyExtractor={item => item.id} onContentSizeChange={() => {}} ListEmptyComponent={<Text style={styles.empty}>Anza mazungumzo kwa kutuma ujumbe.</Text>} renderItem={({item}) => <View style={[styles.bubble, item.sender_id === session.user.id ? styles.myBubble : styles.theirBubble]}><Text style={item.sender_id === session.user.id ? styles.myBubbleText : styles.theirBubbleText}>{item.body}</Text><Text style={styles.bubbleDate}>{new Date(item.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</Text></View>} />
          <View style={styles.messageComposer}><TextInput style={[styles.input, styles.messageInput]} placeholder="Andika ujumbe..." value={messageText} onChangeText={setMessageText} multiline /><TouchableOpacity style={styles.sendButton} onPress={sendMessage}><Text style={styles.primaryText}>➤</Text></TouchableOpacity></View>
        </KeyboardAvoidingView>
      )}

      {tab === 'Profile' && <ScrollView contentContainerStyle={styles.page}><View style={styles.profileHero}><View style={styles.bigAvatar}><Text style={styles.bigAvatarText}>{(myProfile?.full_name || 'I').slice(0,1).toUpperCase()}</Text></View><Text style={styles.heading}>{myProfile?.full_name || session.user.email || session.user.phone}</Text><Text style={styles.muted}>@{myProfile?.username || 'user'}</Text></View><View style={styles.profileInfo}><Text style={styles.infoLabel}>Email</Text><Text style={styles.infoValue}>{session.user.email || 'Haijawekwa'}</Text><Text style={styles.infoLabel}>Namba ya simu</Text><Text style={styles.infoValue}>{session.user.phone || 'Haijawekwa'}</Text><Text style={styles.infoLabel}>Post zako</Text><Text style={styles.infoValue}>{posts.filter(p => p.user_id === session.user.id).length}</Text></View><TouchableOpacity style={styles.primaryButton} onPress={signOut}><Text style={styles.primaryText}>Toka kwenye akaunti</Text></TouchableOpacity></ScrollView>}

      {!activePerson && <View style={styles.bottomNav}>{['Home','Chat','Profile'].map(item => <TouchableOpacity key={item} onPress={() => setTab(item)} style={styles.navItem}><Text style={[styles.navIcon, tab === item && styles.navActive]}>{item === 'Home' ? '⌂' : item === 'Chat' ? '▤' : '●'}</Text><Text style={[styles.navLabel, tab === item && styles.navActive]}>{item === 'Home' ? 'Home' : item === 'Chat' ? 'Inbox' : 'Profile'}</Text></TouchableOpacity>)}</View>}
    </SafeAreaView>
  );
}

function Center({ children }) {
  return <View style={styles.center}>{children}</View>;
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: '#F6F8FC' },
  authScreen: { flex: 1, backgroundColor: LIGHT, alignItems: 'center', justifyContent: 'center', padding: 22 },
  logoCircle: { width: 76, height: 76, borderRadius: 24, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center', elevation: 5 },
  logoText: { color: 'white', fontSize: 28, fontWeight: '900' },
  brand: { color: '#10264D', fontSize: 30, fontWeight: '900', marginTop: 14 },
  tagline: { color: '#62718A', marginTop: 4, marginBottom: 24 },
  authCard: { width: '100%', maxWidth: 440, backgroundColor: 'white', borderRadius: 22, padding: 20, elevation: 3 },
  heading: { fontSize: 22, color: '#13294B', fontWeight: '800', marginBottom: 12 },
  input: { backgroundColor: '#F6F8FC', borderWidth: 1, borderColor: '#E1E8F4', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: '#162744', marginBottom: 11, fontSize: 15 },
  switchRow: { flexDirection: 'row', backgroundColor: '#EEF3FC', borderRadius: 12, padding: 4, marginBottom: 12 },
  methodButton: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 9 },
  methodActive: { backgroundColor: BLUE },
  methodText: { color: '#50627F', fontWeight: '700' },
  methodTextActive: { color: 'white' },
  primaryButton: { backgroundColor: BLUE, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 3 },
  primaryText: { color: 'white', fontWeight: '800', fontSize: 15 },
  linkText: { textAlign: 'center', color: BLUE, fontWeight: '700', marginTop: 18 },
  smallNote: { color: '#7C8BA4', fontSize: 11, textAlign: 'center', marginTop: 18 },
  header: { paddingHorizontal: 18, paddingVertical: 12, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#E8EDF5', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerBrand: { color: BLUE, fontSize: 23, fontWeight: '900' },
  headerSub: { color: '#7C8BA4', fontSize: 12, marginTop: 1 },
  avatarMini: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#DCE9FF', alignItems: 'center', justifyContent: 'center' },
  avatarMiniText: { color: BLUE, fontSize: 18, fontWeight: '900' },
  feed: { padding: 14, paddingBottom: 100 },
  composeCard: { backgroundColor: 'white', borderRadius: 18, padding: 14, marginBottom: 14, elevation: 1 },
  cardTitle: { color: '#1B2E4B', fontSize: 16, fontWeight: '800', marginBottom: 10 },
  captionInput: { minHeight: 72, textAlignVertical: 'top', marginBottom: 8 },
  composeActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  secondaryButton: { backgroundColor: '#EAF1FF', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 11, alignSelf: 'flex-start' },
  secondaryText: { color: BLUE, fontWeight: '800' },
  primarySmall: { backgroundColor: BLUE, paddingVertical: 10, paddingHorizontal: 22, borderRadius: 11 },
  previewImage: { width: '100%', height: 180, borderRadius: 12, marginBottom: 10 },
  postCard: { backgroundColor: 'white', borderRadius: 18, padding: 14, marginBottom: 14, elevation: 1 },
  postAuthor: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#DCE9FF', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: BLUE, fontWeight: '900', fontSize: 17 },
  authorName: { color: '#1B2E4B', fontWeight: '800', fontSize: 15 },
  muted: { color: '#8794A9', fontSize: 12, marginTop: 2 },
  postCaption: { color: '#253752', fontSize: 15, lineHeight: 22, marginBottom: 10 },
  postImage: { width: '100%', height: 260, borderRadius: 13, backgroundColor: '#EAF0F8' },
  postDate: { color: '#98A4B6', fontSize: 11, marginTop: 10 },
  empty: { textAlign: 'center', color: '#8A97AA', padding: 28, lineHeight: 21 },
  page: { flex: 1, padding: 18, paddingBottom: 100 },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'white', borderRadius: 14, padding: 12, marginTop: 10 },
  chevron: { color: BLUE, fontSize: 28, marginRight: 8 },
  chatPage: { flex: 1, paddingBottom: 75 },
  chatHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#E5EBF5' },
  bubble: { maxWidth: '82%', padding: 11, borderRadius: 15, marginBottom: 10 },
  myBubble: { alignSelf: 'flex-end', backgroundColor: BLUE, borderBottomRightRadius: 4 },
  theirBubble: { alignSelf: 'flex-start', backgroundColor: 'white', borderBottomLeftRadius: 4 },
  myBubbleText: { color: 'white', fontSize: 15 },
  theirBubbleText: { color: '#20334F', fontSize: 15 },
  bubbleDate: { color: '#C9D9F5', fontSize: 10, alignSelf: 'flex-end', marginTop: 4 },
  messageComposer: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 8, backgroundColor: 'white' },
  messageInput: { flex: 1, marginBottom: 0, maxHeight: 90 },
  sendButton: { backgroundColor: BLUE, width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', backgroundColor: 'white', borderTopWidth: 1, borderColor: '#E6ECF5', paddingBottom: Platform.OS === 'ios' ? 20 : 7, paddingTop: 7 },
  navItem: { flex: 1, alignItems: 'center', padding: 4 },
  navIcon: { color: '#9AA7B9', fontSize: 22, fontWeight: '800' },
  navLabel: { color: '#9AA7B9', fontSize: 11, marginTop: 2, fontWeight: '700' },
  navActive: { color: BLUE },
  profileHero: { alignItems: 'center', backgroundColor: 'white', borderRadius: 18, padding: 24, marginBottom: 14 },
  bigAvatar: { width: 82, height: 82, borderRadius: 41, backgroundColor: '#DCE9FF', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  bigAvatarText: { color: BLUE, fontSize: 32, fontWeight: '900' },
  profileInfo: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 16 },
  infoLabel: { color: '#8996A9', fontSize: 12, marginTop: 8 },
  infoValue: { color: '#1D304D', fontWeight: '700', fontSize: 15, marginTop: 3 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: LIGHT, gap: 12 }
});
