import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Platform,
} from 'react-native';

const C = {
  bg: '#060B18',
  card: 'rgba(18, 28, 55, 0.75)',
  border: 'rgba(0, 230, 255, 0.28)',
  cyan: '#00E5FF',
  text: '#F0F7FF',
  muted: '#8BA3C7',
  correct: '#34D399',
  wrong: '#F87171',
};

export default function ResultScreen({ route, navigation }) {
  const { score, total, answers, title } = route.params;
  const percent = Math.round((score / total) * 100);

  let msg = 'Keep practicing!';
  if (percent >= 80) msg = 'Excellent! Almost perfect 🔥';
  else if (percent >= 60) msg = 'Good job! Thoda aur practice karo';
  else if (percent >= 40) msg = 'Average. Revision zaroori hai';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>{title || 'Quiz Result'}</Text>
          <Text style={styles.scoreValue}>
            {score}
            <Text style={styles.scoreTotal}>/{total}</Text>
          </Text>
          <Text style={styles.percent}>{percent}%</Text>
          <Text style={styles.msg}>{msg}</Text>
        </View>

        <Text style={styles.sectionTitle}>Review Answers</Text>
        {answers.map((a, i) => (
          <View
            key={i}
            style={[
              styles.review,
              { borderLeftColor: a.isCorrect ? C.correct : C.wrong },
            ]}
          >
            <View style={styles.reviewHead}>
              <Text style={styles.reviewNum}>Q{i + 1}</Text>
              <Text
                style={{
                  color: a.isCorrect ? C.correct : C.wrong,
                  fontWeight: '700',
                  fontSize: 12,
                }}
              >
                {a.isCorrect ? '✓ Correct' : '✗ Wrong'}
              </Text>
            </View>
            <Text style={styles.reviewQ}>{a.question}</Text>
            <Text style={styles.reviewA}>Your answer: {a.options[a.selected]}</Text>
            {!a.isCorrect && (
              <Text style={{ color: C.correct, fontSize: 12, marginTop: 4 }}>
                Correct: {a.options[a.correct]}
              </Text>
            )}
          </View>
        ))}

        <TouchableOpacity
          style={styles.btn}
          onPress={() => navigation.navigate('Home')}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>← Back to Home</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingBottom: 48 },
  scoreCard: {
    backgroundColor: C.card,
    borderRadius: 22,
    padding: 28,
    alignItems: 'center',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: C.border,
  },
  scoreLabel: {
    color: C.muted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  scoreValue: {
    fontSize: 52,
    fontWeight: '800',
    color: C.cyan,
  },
  scoreTotal: {
    fontSize: 24,
    color: C.muted,
    fontWeight: '500',
  },
  percent: {
    fontSize: 20,
    fontWeight: '700',
    color: C.text,
    marginTop: 4,
  },
  msg: {
    color: C.muted,
    marginTop: 12,
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
    marginBottom: 14,
  },
  review: {
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
  },
  reviewHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  reviewNum: {
    color: C.muted,
    fontWeight: '700',
    fontSize: 12,
  },
  reviewQ: {
    color: C.text,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
    lineHeight: 19,
  },
  reviewA: {
    color: C.muted,
    fontSize: 12,
  },
  btn: {
    backgroundColor: C.cyan,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  btnText: {
    color: '#060B18',
    fontSize: 15,
    fontWeight: '800',
  },
});
