import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  ScrollView, StatusBar, Dimensions, FlatList, Platform,
} from 'react-native';
import API from '../services/api';

const { width } = Dimensions.get('window');
const SLIDE_W = width - 48;

const C = {
  bg: '#060B18',
  card: 'rgba(18, 28, 55, 0.72)',
  glass: 'rgba(100, 180, 255, 0.07)',
  glassStrong: 'rgba(0, 220, 255, 0.12)',
  border: 'rgba(0, 230, 255, 0.28)',
  borderSoft: 'rgba(0, 200, 255, 0.15)',
  cyan: '#00E5FF',
  cyanDim: '#00B8D4',
  purple: '#A78BFA',
  magenta: '#F472B6',
  text: '#F0F7FF',
  muted: '#8BA3C7',
  success: '#34D399',
};

const FALLBACK_BANNERS = [
  { _id: 'fb1', title: 'SSC CGL 2026', subtitle: 'Tier-I & Tier-II latest pattern' },
  { _id: 'fb2', title: 'Banking Exams', subtitle: 'IBPS · SBI PO & Clerk' },
  { _id: 'fb3', title: 'Railway RRB', subtitle: 'NTPC · Group D · ALP · JE' },
  { _id: 'fb4', title: 'UPSC Prelims', subtitle: 'GS Paper I & CSAT' },
  { _id: 'fb5', title: 'Defence Forces', subtitle: 'NDA · CDS · AFCAT · Agniveer' },
];

const FALLBACK_CATEGORIES = [
  { _id: 'fc1', name: 'UPSC', icon: '🇮🇳' },
  { _id: 'fc2', name: 'SSC', icon: '🏛️' },
  { _id: 'fc3', name: 'Banking', icon: '🏦' },
  { _id: 'fc4', name: 'Railways', icon: '🚂' },
  { _id: 'fc5', name: 'Defence', icon: '🛡️' },
  { _id: 'fc6', name: 'Teaching', icon: '👨‍🏫' },
  { _id: 'fc7', name: 'State PSC', icon: '📋' },
  { _id: 'fc8', name: 'Police', icon: '👮' },
  { _id: 'fc9', name: 'Insurance', icon: '📄' },
  { _id: 'fc10', name: 'PSU', icon: '🏭' },
  { _id: 'fc11', name: 'Judicial', icon: '⚖️' },
  { _id: 'fc12', name: 'Engineering', icon: '⚙️' },
];

const FALLBACK_SUBJECTS = [
  { _id: 'fs1', name: 'Quantitative Aptitude', icon: '🔢' },
  { _id: 'fs2', name: 'Reasoning Ability', icon: '🧠' },
  { _id: 'fs3', name: 'English Language', icon: '📝' },
  { _id: 'fs4', name: 'General Awareness', icon: '🌍' },
  { _id: 'fs5', name: 'Current Affairs', icon: '📰' },
  { _id: 'fs6', name: 'Computer Awareness', icon: '💻' },
  { _id: 'fs7', name: 'General Science', icon: '🔬' },
  { _id: 'fs8', name: 'History', icon: '📜' },
];

export default function HomeScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [banners, setBanners] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [usingFallback, setUsingFallback] = useState(false);
  const bannerRef = useRef(null);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [bRes, cRes, sRes] = await Promise.all([
        API.get('/banners'),
        API.get('/categories'),
        API.get('/subjects'),
      ]);
      const b = bRes.data || [];
      const c = cRes.data || [];
      const s = sRes.data || [];
      const empty = !b.length && !c.length;
      setUsingFallback(empty);
      setBanners(b.length ? b : FALLBACK_BANNERS);
      setCategories(c.length ? c : FALLBACK_CATEGORIES);
      setSubjects(s.length ? s : []);
      if (c.length) setSelectedCategory(c[0]._id);
      else setSelectedCategory(FALLBACK_CATEGORIES[0]._id);
    } catch (err) {
      setUsingFallback(true);
      setBanners(FALLBACK_BANNERS);
      setCategories(FALLBACK_CATEGORIES);
      setSubjects([]);
      setSelectedCategory(FALLBACK_CATEGORIES[0]._id);
      setError('Server offline — demo design. Seed data ke baad refresh karein.');
      console.log(err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => {
      setBannerIndex((p) => {
        const n = (p + 1) % banners.length;
        try { bannerRef.current?.scrollToIndex({ index: n, animated: true }); } catch (_) {}
        return n;
      });
    }, 4200);
    return () => clearInterval(t);
  }, [banners]);

  const filteredSubjects = selectedCategory
    ? subjects.filter((s) => (s.category?._id || s.category) === selectedCategory)
    : subjects;

  const displaySubjects = filteredSubjects.length
    ? filteredSubjects
    : (usingFallback || subjects.length === 0 ? FALLBACK_SUBJECTS : []);

  const isLiveData = !usingFallback && subjects.length > 0;

  const startQuiz = async (subjectId, subjectName, categoryId) => {
    if (!isLiveData || String(subjectId).startsWith('fs') || String(categoryId).startsWith('fc')) {
      alert('Demo mode: pehle backend me npm run seed chalao.');
      return;
    }
    try {
      const res = await API.get('/questions', { params: { subject: subjectId, category: categoryId } });
      const qs = res.data || [];
      if (!qs.length) { alert('Is subject me abhi koi question nahi hai.'); return; }
      navigation.navigate('Quiz', { questions: qs, title: subjectName });
    } catch {
      alert('Questions load nahi ho paye');
    }
  };

  const startCategoryQuiz = async (catId, catName) => {
    if (!isLiveData || String(catId).startsWith('fc')) {
      alert('Demo mode: pehle backend seed chalao.');
      return;
    }
    try {
      const res = await API.get('/questions', { params: { category: catId } });
      const qs = res.data || [];
      if (!qs.length) { alert('Is exam me abhi koi question nahi hai.'); return; }
      navigation.navigate('Quiz', { questions: qs, title: catName });
    } catch {
      alert('Questions load nahi ho paye');
    }
  };

  const renderBanner = ({ item }) => (
    <View style={styles.slide}>
      <View style={styles.slideInner}>
        <Text style={styles.slideBadge}>FEATURED</Text>
        <Text style={styles.slideTitle} numberOfLines={1}>{item.title}</Text>
        {!!item.subtitle && (
          <Text style={styles.slideSub} numberOfLines={2}>{item.subtitle}</Text>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={C.cyan} />
        <Text style={{ color: C.muted, marginTop: 14, fontSize: 14 }}>Loading exams...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 56 }}
      >
        <View style={styles.hero}>
          <View style={styles.heroGlow} />
          <Text style={styles.heroBadge}>INDIA GOVT EXAMS</Text>
          <Text style={styles.heroTitle}>Sarkari Exam Quiz</Text>
          <Text style={styles.heroSub}>SSC · Banking · UPSC · Railways · Defence · PSC</Text>

          {!!error && (
            <View style={styles.note}>
              <Text style={styles.noteText}>{error}</Text>
            </View>
          )}
          {usingFallback && !error && (
            <View style={styles.note}>
              <Text style={styles.noteText}>Demo design — seed data ke baad live questions milenge</Text>
            </View>
          )}
        </View>

        <View style={styles.sliderWrap}>
          <FlatList
            ref={bannerRef}
            data={banners}
            renderItem={renderBanner}
            keyExtractor={(item) => String(item._id)}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToInterval={SLIDE_W + 14}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: 24 }}
            ItemSeparatorComponent={() => <View style={{ width: 14 }} />}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / (SLIDE_W + 14));
              setBannerIndex(Math.min(Math.max(idx, 0), banners.length - 1));
            }}
            getItemLayout={(_, index) => ({
              length: SLIDE_W + 14,
              offset: (SLIDE_W + 14) * index,
              index,
            })}
          />
          <View style={styles.dots}>
            {banners.map((_, i) => (
              <View key={i} style={[styles.dot, i === bannerIndex && styles.dotActive]} />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Exam</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 24 }}>
            {categories.map((cat) => {
              const active = selectedCategory === cat._id;
              return (
                <TouchableOpacity
                  key={String(cat._id)}
                  style={[styles.catCard, active && styles.catCardActive]}
                  onPress={() => setSelectedCategory(cat._id)}
                  onLongPress={() => startCategoryQuiz(cat._id, cat.name)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.catIcon}>{cat.icon || '◈'}</Text>
                  <Text style={[styles.catName, active && styles.catNameActive]} numberOfLines={1}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Subjects</Text>
            {isLiveData && (
              <Text style={styles.liveBadge}>● LIVE</Text>
            )}
          </View>

          {displaySubjects.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Is exam ke liye subjects nahi mile. Seed data check karo.</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {displaySubjects.map((sub) => (
                <TouchableOpacity
                  key={String(sub._id)}
                  style={styles.subCard}
                  onPress={() => startQuiz(sub._id, sub.name, selectedCategory)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.subIcon}>{sub.icon || '📖'}</Text>
                  <Text style={styles.subName} numberOfLines={2}>{sub.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={fetchData} activeOpacity={0.8}>
          <Text style={styles.refreshText}>↻ Refresh Data</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { justifyContent: 'center', alignItems: 'center' },

  hero: {
    paddingTop: Platform.OS === 'ios' ? 58 : 42,
    paddingHorizontal: 24,
    paddingBottom: 8,
    position: 'relative',
  },
  heroGlow: {
    position: 'absolute',
    top: -40,
    left: width * 0.2,
    width: width * 0.6,
    height: 180,
    backgroundColor: 'rgba(0, 200, 255, 0.08)',
    borderRadius: 100,
  },
  heroBadge: {
    color: C.cyan,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.5,
  },
  heroSub: {
    marginTop: 6,
    color: C.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  note: {
    marginTop: 14,
    backgroundColor: 'rgba(244, 114, 182, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(244, 114, 182, 0.3)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  noteText: { color: '#F9A8D4', fontSize: 12, lineHeight: 17 },

  sliderWrap: { marginTop: 22 },
  slide: {
    width: SLIDE_W,
    height: 118,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
  },
  slideInner: {
    flex: 1,
    padding: 18,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 180, 255, 0.06)',
  },
  slideBadge: {
    color: C.cyan,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  slideTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
    marginBottom: 4,
  },
  slideSub: { fontSize: 13, color: C.muted, lineHeight: 18 },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 14,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0, 200, 255, 0.25)',
  },
  dotActive: {
    width: 18,
    backgroundColor: C.cyan,
  },

  section: { marginTop: 28, paddingHorizontal: 24 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
    marginBottom: 14,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  liveBadge: {
    color: C.success,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },

  catCard: {
    width: 86,
    marginRight: 10,
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.borderSoft,
    backgroundColor: C.glass,
    alignItems: 'center',
  },
  catCardActive: {
    borderColor: C.cyan,
    backgroundColor: C.glassStrong,
  },
  catIcon: { fontSize: 24, marginBottom: 6 },
  catName: {
    color: C.muted,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  catNameActive: { color: C.cyan },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  subCard: {
    width: (width - 60) / 2,
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.borderSoft,
    paddingVertical: 18,
    paddingHorizontal: 14,
    minHeight: 96,
  },
  subIcon: { fontSize: 22, marginBottom: 10 },
  subName: {
    color: C.text,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },

  empty: {
    marginTop: 8,
    padding: 18,
    borderRadius: 14,
    backgroundColor: C.glass,
    borderWidth: 1,
    borderColor: C.borderSoft,
  },
  emptyText: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },

  refreshBtn: {
    marginTop: 32,
    marginHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.glass,
    alignItems: 'center',
  },
  refreshText: {
    color: C.cyan,
    fontSize: 14,
    fontWeight: '700',
  },
});
