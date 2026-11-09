import React, { useState } from 'react';
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
  glass: 'rgba(100, 180, 255, 0.08)',
};

export default function QuizScreen({ route, navigation }) {
  const { questions, title } = route.params;
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [showFeedback, setShowFeedback] = useState(false);

  const q = questions[current];
  const progress = ((current + 1) / questions.length) * 100;

  const handleSelect = (i) => {
    if (!showFeedback) setSelected(i);
  };

  const handleNext = () => {
    if (selected === null) return;
    const isCorrect = selected === q.correctAnswer;
    const newAnswers = [
      ...answers,
      {
        questionId: q._id,
        selected,
        correct: q.correctAnswer,
        isCorrect,
        question: q.question,
        options: q.options,
      },
    ];
    setAnswers(newAnswers);

    if (current + 1 < questions.length) {
      setCurrent(current + 1);
      setSelected(null);
      setShowFeedback(false);
    } else {
      navigation.replace('Result', {
        score: newAnswers.filter((a) => a.isCorrect).length,
        total: questions.length,
        answers: newAnswers,
        title: title || 'Quiz',
      });
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={styles.header}>
        <Text style={styles.headerTitle} numberOfLines={1}>{title || 'Quiz'}</Text>
        <Text style={styles.progressText}>{current + 1} / {questions.length}</Text>
        <View style={styles.barBg}>
          <View style={[styles.barFill, { width: `${progress}%` }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.qCard}>
          <Text style={styles.qLabel}>QUESTION {current + 1}</Text>
          <Text style={styles.qText}>{q.question}</Text>
        </View>

        {q.options.map((opt, i) => {
          let optStyle = styles.opt;
          let textStyle = styles.optText;

          if (showFeedback) {
            if (i === q.correctAnswer) {
              optStyle = [styles.opt, styles.optCorrect];
              textStyle = [styles.optText, { color: C.correct }];
            } else if (i === selected && selected !== q.correctAnswer) {
              optStyle = [styles.opt, styles.optWrong];
              textStyle = [styles.optText, { color: C.wrong }];
            }
          } else if (selected === i) {
            optStyle = [styles.opt, styles.optSelected];
            textStyle = [styles.optText, { color: C.cyan }];
          }

          return (
            <TouchableOpacity
              key={i}
              style={optStyle}
              onPress={() => handleSelect(i)}
              activeOpacity={0.75}
              disabled={showFeedback}
            >
              <View style={styles.optIndex}>
                <Text style={styles.optIndexText}>{String.fromCharCode(65 + i)}</Text>
              </View>
              <Text style={textStyle}>{opt}</Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={[styles.nextBtn, selected === null && styles.nextBtnDisabled]}
          onPress={() => {
            if (!showFeedback && selected !== null) {
              setShowFeedback(true);
            } else {
              handleNext();
            }
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.nextText}>
            {showFeedback
              ? current + 1 === questions.length
                ? 'Finish Quiz'
                : 'Next Question →'
              : 'Check Answer'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 200, 255, 0.12)',
  },
  headerTitle: {
    color: C.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
  },
  progressText: {
    color: C.muted,
    fontSize: 12,
    marginBottom: 10,
  },
  barBg: {
    height: 5,
    backgroundColor: 'rgba(0, 200, 255, 0.12)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: 5,
    backgroundColor: C.cyan,
    borderRadius: 3,
  },
  content: { padding: 20, paddingBottom: 48 },
  qCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    marginBottom: 20,
  },
  qLabel: {
    color: C.cyan,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  qText: {
    color: C.text,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
  opt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.glass,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 200, 255, 0.15)',
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  optSelected: {
    borderColor: C.cyan,
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
  },
  optCorrect: {
    borderColor: C.correct,
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
  },
  optWrong: {
    borderColor: C.wrong,
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
  },
  optIndex: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 200, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optIndexText: {
    color: C.cyan,
    fontWeight: '700',
    fontSize: 13,
  },
  optText: {
    flex: 1,
    color: C.text,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  nextBtn: {
    marginTop: 18,
    backgroundColor: C.cyan,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  nextBtnDisabled: {
    opacity: 0.4,
  },
  nextText: {
    color: '#060B18',
    fontSize: 15,
    fontWeight: '800',
  },
});
