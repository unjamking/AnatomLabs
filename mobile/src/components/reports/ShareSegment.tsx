import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Share, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';
import { GlassCard, COLORS } from '../animations';
import api from '../../services/api';

function extractReportData(report: any) {
  const content = report.content || {};
  const summary = content.summary || {};

  return {
    user: content.user || {},
    period: content.period || {},
    nutrition: summary.nutrition || report.nutritionData || {},
    training: summary.training || report.trainingData || {},
    activity: summary.activity || report.activityData || {},
    insights: Array.isArray(content.insights) ? content.insights : [],
    biomarkers: Array.isArray(content.biomarkers) ? content.biomarkers : [],
    generatedAt: content.generatedAt || new Date().toISOString(),
  };
}

function buildReportHtml(report: any, selectedSections: string[]): string {
  const data = extractReportData(report);
  const { user, period, nutrition: n, training: t, activity: a, insights, biomarkers } = data;

  const formatDate = (d: string) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const periodStr = period.start && period.end
    ? `${formatDate(period.start)} — ${formatDate(period.end)}`
    : `${new Date(Date.now() - 30 * 86400000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} — ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;

  let nutritionHtml = '';
  if (selectedSections.includes('nutrition')) {
    const macroTotal = (n.avgProtein || 0) + (n.avgCarbs || 0) + (n.avgFat || 0);
    const proteinPct = macroTotal > 0 ? Math.round(((n.avgProtein || 0) * 4 / ((n.avgCalories || 1))) * 100) : 0;
    const carbsPct = macroTotal > 0 ? Math.round(((n.avgCarbs || 0) * 4 / ((n.avgCalories || 1))) * 100) : 0;
    const fatPct = macroTotal > 0 ? Math.round(((n.avgFat || 0) * 9 / ((n.avgCalories || 1))) * 100) : 0;

    nutritionHtml = `
      <div class="section">
        <div class="section-header">
          <div class="section-icon" style="background:#e74c3c15;">🍎</div>
          <h2>Nutrition Overview</h2>
        </div>
        <div class="highlight-card">
          <div class="highlight-value">${n.avgCalories || 0}</div>
          <div class="highlight-label">Average Daily Calories</div>
          ${n.daysTracked ? `<div class="highlight-meta">${n.daysTracked} days tracked</div>` : ''}
        </div>
        <div class="stats-grid">
          <div class="stat-box protein">
            <div class="stat-value">${n.avgProtein || 0}g</div>
            <div class="stat-label">Avg Protein</div>
            <div class="stat-bar"><div class="stat-bar-fill" style="width:${proteinPct}%;background:#3498db;"></div></div>
            <div class="stat-pct">${proteinPct}% of calories</div>
          </div>
          <div class="stat-box carbs">
            <div class="stat-value">${n.avgCarbs || 0}g</div>
            <div class="stat-label">Avg Carbs</div>
            <div class="stat-bar"><div class="stat-bar-fill" style="width:${carbsPct}%;background:#f39c12;"></div></div>
            <div class="stat-pct">${carbsPct}% of calories</div>
          </div>
          <div class="stat-box fat">
            <div class="stat-value">${n.avgFat || 0}g</div>
            <div class="stat-label">Avg Fat</div>
            <div class="stat-bar"><div class="stat-bar-fill" style="width:${fatPct}%;background:#e74c3c;"></div></div>
            <div class="stat-pct">${fatPct}% of calories</div>
          </div>
        </div>
        ${n.adherenceScore ? `
          <div class="adherence-row">
            <span>Diet Adherence</span>
            <div class="adherence-bar"><div class="adherence-fill" style="width:${n.adherenceScore}%;"></div></div>
            <strong>${n.adherenceScore}%</strong>
          </div>
        ` : ''}
      </div>
    `;
  }

  let trainingHtml = '';
  if (selectedSections.includes('training')) {
    const muscleRows = (t.muscleGroupDistribution || []).map((m: any) => `
      <tr>
        <td>${m.muscle}</td>
        <td class="center">${m.sets}</td>
        <td>
          <div class="muscle-bar"><div class="muscle-bar-fill" style="width:${m.percentage}%;"></div></div>
        </td>
        <td class="center">${m.percentage}%</td>
      </tr>
    `).join('');

    trainingHtml = `
      <div class="section">
        <div class="section-header">
          <div class="section-icon" style="background:#2ecc7115;">💪</div>
          <h2>Training Summary</h2>
        </div>
        <div class="stats-grid three-col">
          <div class="stat-box">
            <div class="stat-icon">🏋️</div>
            <div class="stat-value">${t.totalWorkouts || 0}</div>
            <div class="stat-label">Workouts</div>
          </div>
          <div class="stat-box">
            <div class="stat-icon">📊</div>
            <div class="stat-value">${t.totalVolume ? (t.totalVolume > 999 ? `${(t.totalVolume / 1000).toFixed(1)}k` : t.totalVolume) : 0}</div>
            <div class="stat-label">Total Volume (kg)</div>
          </div>
          <div class="stat-box">
            <div class="stat-icon">⏱️</div>
            <div class="stat-value">${t.avgDuration || 0}</div>
            <div class="stat-label">Avg Duration (min)</div>
          </div>
        </div>
        ${muscleRows ? `
          <div class="subsection">
            <h3>Muscle Group Distribution</h3>
            <table class="muscle-table">
              <thead>
                <tr><th>Muscle Group</th><th class="center">Sets</th><th>Distribution</th><th class="center">%</th></tr>
              </thead>
              <tbody>${muscleRows}</tbody>
            </table>
          </div>
        ` : ''}
      </div>
    `;
  }

  let activityHtml = '';
  if (selectedSections.includes('activity')) {
    activityHtml = `
      <div class="section">
        <div class="section-header">
          <div class="section-icon" style="background:#9b59b615;">🚶</div>
          <h2>Daily Activity</h2>
        </div>
        <div class="stats-grid">
          <div class="stat-box">
            <div class="stat-icon">👣</div>
            <div class="stat-value">${(a.avgSteps || 0).toLocaleString()}</div>
            <div class="stat-label">Avg Daily Steps</div>
          </div>
          <div class="stat-box">
            <div class="stat-icon">🔥</div>
            <div class="stat-value">${a.avgCaloriesBurned || 0}</div>
            <div class="stat-label">Avg Calories Burned</div>
          </div>
        </div>
        <div class="stats-grid">
          <div class="stat-box">
            <div class="stat-icon">💧</div>
            <div class="stat-value">${a.avgWaterIntake || 0}<span class="unit">ml</span></div>
            <div class="stat-label">Avg Water Intake</div>
          </div>
          <div class="stat-box">
            <div class="stat-icon">😴</div>
            <div class="stat-value">${a.avgSleepHours || 0}<span class="unit">h</span></div>
            <div class="stat-label">Avg Sleep</div>
          </div>
        </div>
        ${a.totalActiveDays ? `<div class="meta-note">${a.totalActiveDays} active days logged this period</div>` : ''}
      </div>
    `;
  }

  let insightsHtml = '';
  if (selectedSections.includes('insights') && insights.length > 0) {
    insightsHtml = `
      <div class="section">
        <div class="section-header">
          <div class="section-icon" style="background:#f39c1215;">💡</div>
          <h2>AI Insights</h2>
        </div>
        ${insights.map((i: any, idx: number) => `
          <div class="insight-card">
            <div class="insight-num">${idx + 1}</div>
            <div class="insight-body">
              <strong>${i.title || 'Insight'}</strong>
              <p>${i.description || ''}</p>
              ${i.recommendation ? `<div class="insight-rec">→ ${i.recommendation}</div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  let healthHtml = '';
  if (selectedSections.includes('health')) {
    const latestBiomarkers: Record<string, any> = {};
    biomarkers.forEach((b: any) => {
      if (!latestBiomarkers[b.type]) latestBiomarkers[b.type] = b;
    });

    const biomarkerCards = Object.values(latestBiomarkers).map((b: any) => `
      <div class="stat-box">
        <div class="stat-value">${b.value}<span class="unit">${b.unit || ''}</span></div>
        <div class="stat-label">${b.type}</div>
        <div class="stat-date">${new Date(b.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
      </div>
    `).join('');

    const conditions = user.healthConditions || [];

    healthHtml = `
      <div class="section">
        <div class="section-header">
          <div class="section-icon" style="background:#e74c3c15;">❤️</div>
          <h2>Health Overview</h2>
        </div>
        ${conditions.length > 0 ? `
          <div class="conditions-row">
            ${conditions.map((c: string) => `<span class="condition-tag">${c}</span>`).join('')}
          </div>
        ` : ''}
        ${biomarkerCards ? `<div class="stats-grid">${biomarkerCards}</div>` : '<div class="meta-note">No biomarker data recorded in this period</div>'}
      </div>
    `;
  }

  let userInfoHtml = '';
  if (user.name || user.goal) {
    userInfoHtml = `
      <div class="user-banner">
        ${user.name ? `<div class="user-name">${user.name}</div>` : ''}
        <div class="user-details">
          ${user.age ? `<span>${user.age} yrs</span>` : ''}
          ${user.weight ? `<span>${user.weight} kg</span>` : ''}
          ${user.height ? `<span>${user.height} cm</span>` : ''}
          ${user.goal ? `<span class="goal-tag">${user.goal.replace('_', ' ')}</span>` : ''}
        </div>
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        @page { margin: 30px 20px; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1a1a2e; background: #fff; padding: 32px; font-size: 13px; line-height: 1.5; }
        .header { text-align: center; margin-bottom: 28px; padding-bottom: 18px; border-bottom: 3px solid #e74c3c; }
        .header h1 { font-size: 26px; color: #e74c3c; letter-spacing: -0.5px; margin-bottom: 2px; }
        .header .subtitle { color: #888; font-size: 12px; }
        .user-banner { text-align: center; margin-bottom: 24px; padding: 14px; background: linear-gradient(135deg, #f8f9fa 0%, #eef0f2 100%); border-radius: 12px; }
        .user-name { font-size: 16px; font-weight: 700; color: #1a1a2e; margin-bottom: 4px; }
        .user-details { display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; }
        .user-details span { font-size: 11px; color: #666; }
        .goal-tag { background: #e74c3c20; color: #e74c3c; padding: 2px 8px; border-radius: 4px; text-transform: capitalize; font-weight: 600; }
        .section { margin-bottom: 24px; page-break-inside: avoid; }
        .section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; padding-bottom: 8px; border-bottom: 1px solid #f0f0f0; }
        .section-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; }
        .section-header h2 { font-size: 17px; color: #1a1a2e; font-weight: 700; }
        .subsection { margin-top: 14px; }
        .subsection h3 { font-size: 13px; color: #555; font-weight: 600; margin-bottom: 8px; }
        .highlight-card { text-align: center; background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color: #fff; border-radius: 14px; padding: 20px; margin-bottom: 14px; }
        .highlight-value { font-size: 36px; font-weight: 800; }
        .highlight-label { font-size: 12px; opacity: 0.9; margin-top: 2px; }
        .highlight-meta { font-size: 10px; opacity: 0.7; margin-top: 6px; }
        .stats-grid { display: flex; gap: 10px; margin-bottom: 10px; }
        .stats-grid.three-col .stat-box { min-width: 0; }
        .stat-box { flex: 1; background: #f8f9fb; border-radius: 12px; padding: 14px 10px; text-align: center; }
        .stat-icon { font-size: 18px; margin-bottom: 4px; }
        .stat-value { font-size: 22px; font-weight: 800; color: #1a1a2e; }
        .stat-value .unit { font-size: 12px; font-weight: 600; color: #888; margin-left: 1px; }
        .stat-label { font-size: 10px; color: #888; margin-top: 3px; text-transform: uppercase; letter-spacing: 0.3px; }
        .stat-pct { font-size: 9px; color: #aaa; margin-top: 4px; }
        .stat-date { font-size: 9px; color: #bbb; margin-top: 3px; }
        .stat-bar { width: 100%; height: 4px; background: #eee; border-radius: 2px; margin-top: 6px; overflow: hidden; }
        .stat-bar-fill { height: 100%; border-radius: 2px; }
        .adherence-row { display: flex; align-items: center; gap: 10px; padding: 10px 0; }
        .adherence-bar { flex: 1; height: 8px; background: #eee; border-radius: 4px; overflow: hidden; }
        .adherence-fill { height: 100%; background: linear-gradient(90deg, #e74c3c, #2ecc71); border-radius: 4px; }
        .muscle-table { width: 100%; border-collapse: separate; border-spacing: 0; }
        .muscle-table thead th { font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; color: #999; padding: 6px 8px; border-bottom: 1px solid #eee; font-weight: 600; }
        .muscle-table td { padding: 8px; font-size: 12px; color: #444; border-bottom: 1px solid #f5f5f5; }
        .muscle-table .center { text-align: center; }
        .muscle-bar { width: 100%; height: 6px; background: #f0f0f0; border-radius: 3px; overflow: hidden; }
        .muscle-bar-fill { height: 100%; background: linear-gradient(90deg, #2ecc71, #27ae60); border-radius: 3px; }
        .insight-card { display: flex; gap: 12px; background: #fffbf0; border-radius: 10px; padding: 12px; margin-bottom: 8px; border-left: 3px solid #f39c12; }
        .insight-num { width: 24px; height: 24px; background: #f39c12; color: #fff; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
        .insight-body { flex: 1; }
        .insight-body strong { font-size: 13px; color: #1a1a2e; }
        .insight-body p { color: #666; font-size: 12px; margin-top: 3px; }
        .insight-rec { font-size: 11px; color: #e67e22; margin-top: 4px; font-weight: 500; }
        .conditions-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
        .condition-tag { font-size: 11px; background: #e74c3c15; color: #c0392b; padding: 3px 10px; border-radius: 12px; }
        .meta-note { font-size: 11px; color: #aaa; text-align: center; padding: 8px; }
        .footer { text-align: center; margin-top: 28px; padding-top: 14px; border-top: 1px solid #eee; }
        .footer-brand { font-size: 13px; font-weight: 700; color: #e74c3c; }
        .footer-date { font-size: 10px; color: #bbb; margin-top: 2px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>AnatomLabs+ Fitness Report</h1>
        <div class="subtitle">${periodStr}</div>
      </div>
      ${userInfoHtml}
      ${nutritionHtml}
      ${trainingHtml}
      ${activityHtml}
      ${healthHtml}
      ${insightsHtml}
      <div class="footer">
        <div class="footer-brand">AnatomLabs+</div>
        <div class="footer-date">Generated on ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
      </div>
    </body>
    </html>
  `;
}

function buildReportSummaryHtml(report: any): string {
  const data = extractReportData(report);
  const { user, period, nutrition: n, training: t, activity: a } = data;

  const formatDate = (d: string) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const periodStr = period.start && period.end
    ? `${formatDate(period.start)} - ${formatDate(period.end)}`
    : `Last 30 days`;

  return `
    <div style="background:linear-gradient(145deg,#0a0a0f,#151520);color:#fff;padding:28px 24px;border-radius:24px;font-family:-apple-system,'Helvetica Neue',sans-serif;width:400px;">
      <div style="text-align:center;margin-bottom:22px;">
        <div style="font-size:10px;letter-spacing:2px;color:#e74c3c;text-transform:uppercase;font-weight:700;margin-bottom:4px;">AnatomLabs+</div>
        <div style="font-size:20px;font-weight:800;color:#fff;">${user.name ? `${user.name}'s Report` : 'Fitness Report'}</div>
        <div style="font-size:11px;color:#555;margin-top:3px;">${periodStr}</div>
      </div>

      <div style="background:linear-gradient(135deg,#e74c3c,#c0392b);border-radius:16px;padding:16px;text-align:center;margin-bottom:14px;">
        <div style="font-size:32px;font-weight:800;">${n.avgCalories || '-'}</div>
        <div style="font-size:10px;opacity:0.85;letter-spacing:0.5px;">AVG DAILY CALORIES</div>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:10px;">
        <div style="flex:1;background:#12121a;border-radius:14px;padding:14px 8px;text-align:center;border:1px solid #1e1e2e;">
          <div style="font-size:18px;font-weight:800;color:#3498db;">${n.avgProtein || '-'}g</div>
          <div style="font-size:9px;color:#666;margin-top:2px;letter-spacing:0.3px;">PROTEIN</div>
        </div>
        <div style="flex:1;background:#12121a;border-radius:14px;padding:14px 8px;text-align:center;border:1px solid #1e1e2e;">
          <div style="font-size:18px;font-weight:800;color:#f39c12;">${n.avgCarbs || '-'}g</div>
          <div style="font-size:9px;color:#666;margin-top:2px;letter-spacing:0.3px;">CARBS</div>
        </div>
        <div style="flex:1;background:#12121a;border-radius:14px;padding:14px 8px;text-align:center;border:1px solid #1e1e2e;">
          <div style="font-size:18px;font-weight:800;color:#e74c3c;">${n.avgFat || '-'}g</div>
          <div style="font-size:9px;color:#666;margin-top:2px;letter-spacing:0.3px;">FAT</div>
        </div>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:10px;">
        <div style="flex:1;background:#12121a;border-radius:14px;padding:14px 8px;text-align:center;border:1px solid #1e1e2e;">
          <div style="font-size:18px;font-weight:800;color:#2ecc71;">${t.totalWorkouts || '-'}</div>
          <div style="font-size:9px;color:#666;margin-top:2px;letter-spacing:0.3px;">WORKOUTS</div>
        </div>
        <div style="flex:1;background:#12121a;border-radius:14px;padding:14px 8px;text-align:center;border:1px solid #1e1e2e;">
          <div style="font-size:18px;font-weight:800;color:#9b59b6;">${t.totalVolume ? (t.totalVolume > 999 ? `${(t.totalVolume / 1000).toFixed(1)}k` : t.totalVolume) : '-'}</div>
          <div style="font-size:9px;color:#666;margin-top:2px;letter-spacing:0.3px;">VOLUME (KG)</div>
        </div>
        <div style="flex:1;background:#12121a;border-radius:14px;padding:14px 8px;text-align:center;border:1px solid #1e1e2e;">
          <div style="font-size:18px;font-weight:800;color:#1abc9c;">${t.avgDuration || '-'}</div>
          <div style="font-size:9px;color:#666;margin-top:2px;letter-spacing:0.3px;">AVG MIN</div>
        </div>
      </div>

      <div style="display:flex;gap:8px;">
        <div style="flex:1;background:#12121a;border-radius:14px;padding:14px 8px;text-align:center;border:1px solid #1e1e2e;">
          <div style="font-size:18px;font-weight:800;color:#e67e22;">${(a.avgSteps || 0).toLocaleString()}</div>
          <div style="font-size:9px;color:#666;margin-top:2px;letter-spacing:0.3px;">AVG STEPS</div>
        </div>
        <div style="flex:1;background:#12121a;border-radius:14px;padding:14px 8px;text-align:center;border:1px solid #1e1e2e;">
          <div style="font-size:18px;font-weight:800;color:#3498db;">${a.avgWaterIntake || '-'}ml</div>
          <div style="font-size:9px;color:#666;margin-top:2px;letter-spacing:0.3px;">AVG WATER</div>
        </div>
        <div style="flex:1;background:#12121a;border-radius:14px;padding:14px 8px;text-align:center;border:1px solid #1e1e2e;">
          <div style="font-size:18px;font-weight:800;color:#f39c12;">${a.avgSleepHours || '-'}h</div>
          <div style="font-size:9px;color:#666;margin-top:2px;letter-spacing:0.3px;">AVG SLEEP</div>
        </div>
      </div>

      <div style="text-align:center;margin-top:18px;">
        <div style="font-size:9px;color:#333;letter-spacing:0.3px;">Generated by AnatomLabs+</div>
      </div>
    </div>
  `;
}

export default function ShareSegment() {
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [selectedSections, setSelectedSections] = useState<string[]>(['nutrition', 'training', 'activity', 'insights']);
  const viewShotRef = useRef<ViewShot>(null);

  const sections = [
    { key: 'nutrition', label: 'Nutrition', icon: 'nutrition-outline', color: COLORS.primary },
    { key: 'training', label: 'Training', icon: 'barbell-outline', color: COLORS.success },
    { key: 'activity', label: 'Activity', icon: 'fitness-outline', color: COLORS.info },
    { key: 'health', label: 'Health', icon: 'heart-outline', color: COLORS.error },
    { key: 'insights', label: 'Insights', icon: 'bulb-outline', color: COLORS.warning },
  ];

  const toggleSection = (key: string) => {
    setSelectedSections(prev =>
      prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]
    );
  };

  const handleGenerate = async () => {
    if (selectedSections.length === 0) {
      Alert.alert('Select Sections', 'Please select at least one section to include');
      return;
    }

    setGenerating(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const report = await api.generateReport(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0],
        selectedSections,
      );
      setReportId(report.id);
      setReportData(report);
      Alert.alert('Report Generated', 'Your report has been generated successfully');
    } catch (e) {
      Alert.alert('Error', 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!reportId) {
      Alert.alert('Generate First', 'Generate a report before sharing');
      return;
    }

    try {
      const result = await api.shareReport(reportId, 72);
      setShareToken(result.shareToken);

      await Share.share({
        message: `Check out my fitness report! Token: ${result.shareToken}`,
        title: 'My Fitness Report',
      });
    } catch (e) {
      Alert.alert('Error', 'Failed to create share link');
    }
  };

  const handleExportPdf = async () => {
    if (!reportData) {
      Alert.alert('Generate First', 'Generate a report before exporting');
      return;
    }

    setExporting(true);
    try {
      const html = buildReportHtml(reportData, selectedSections);
      const { uri } = await Print.printToFileAsync({ html, base64: false });

      const pdfName = `AnatomLabs_Report_${new Date().toISOString().split('T')[0]}.pdf`;

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Save or Share Report PDF',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('PDF Saved', `Report saved to: ${pdfName}`);
      }
    } catch (e: any) {
      console.error('PDF export error:', e);
      Alert.alert('Error', 'Failed to export PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleSaveImage = async () => {
    if (!reportData) {
      Alert.alert('Generate First', 'Generate a report before saving as image');
      return;
    }

    setSavingImage(true);
    try {
      const html = buildReportSummaryHtml(reportData);
      const { uri: pdfUri } = await Print.printToFileAsync({
        html: `<html><body style="display:flex;justify-content:center;align-items:center;min-height:100vh;background:#000;margin:0;">${html}</body></html>`,
        width: 440,
        height: 580,
        base64: false,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(pdfUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Save Report Summary',
        });
      } else {
        Alert.alert('Saved', 'Report summary saved successfully');
      }
    } catch (e: any) {
      console.error('Image save error:', e);
      Alert.alert('Error', 'Failed to save image. Please try again.');
    } finally {
      setSavingImage(false);
    }
  };

  return (
    <View style={styles.container}>
      <GlassCard>
        <View style={styles.cardHeader}>
          <Ionicons name="document-text-outline" size={20} color={COLORS.info} />
          <Text style={styles.cardTitle}>Generate Report</Text>
        </View>
        <Text style={styles.description}>Create a comprehensive report of your last 30 days. Select which sections to include:</Text>

        <View style={styles.sectionGrid}>
          {sections.map(s => {
            const selected = selectedSections.includes(s.key);
            return (
              <TouchableOpacity
                key={s.key}
                style={[styles.sectionChip, selected && { backgroundColor: s.color + '20', borderColor: s.color }]}
                onPress={() => toggleSection(s.key)}
              >
                <Ionicons name={s.icon as any} size={18} color={selected ? s.color : COLORS.textTertiary} />
                <Text style={[styles.sectionChipText, selected && { color: s.color }]}>{s.label}</Text>
                {selected && <Ionicons name="checkmark-circle" size={16} color={s.color} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={styles.generateBtn} onPress={handleGenerate} disabled={generating}>
          {generating ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="create-outline" size={20} color="#fff" />
              <Text style={styles.generateBtnText}>Generate Report</Text>
            </>
          )}
        </TouchableOpacity>
      </GlassCard>

      {reportId && (
        <GlassCard>
          <View style={styles.cardHeader}>
            <Ionicons name="share-outline" size={20} color={COLORS.success} />
            <Text style={styles.cardTitle}>Share & Export</Text>
          </View>

          <View style={styles.actionGrid}>
            <TouchableOpacity style={styles.actionCard} onPress={handleShare}>
              <View style={[styles.actionIcon, { backgroundColor: COLORS.info + '20' }]}>
                <Ionicons name="link-outline" size={24} color={COLORS.info} />
              </View>
              <Text style={styles.actionLabel}>Share Link</Text>
              <Text style={styles.actionDesc}>Create a shareable link for coaches</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard} onPress={handleExportPdf} disabled={exporting}>
              <View style={[styles.actionIcon, { backgroundColor: COLORS.error + '20' }]}>
                {exporting ? (
                  <ActivityIndicator size="small" color={COLORS.error} />
                ) : (
                  <Ionicons name="document-outline" size={24} color={COLORS.error} />
                )}
              </View>
              <Text style={styles.actionLabel}>Export PDF</Text>
              <Text style={styles.actionDesc}>Download as PDF document</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard} onPress={handleSaveImage} disabled={savingImage}>
              <View style={[styles.actionIcon, { backgroundColor: COLORS.success + '20' }]}>
                {savingImage ? (
                  <ActivityIndicator size="small" color={COLORS.success} />
                ) : (
                  <Ionicons name="image-outline" size={24} color={COLORS.success} />
                )}
              </View>
              <Text style={styles.actionLabel}>Save Summary</Text>
              <Text style={styles.actionDesc}>Save report summary card</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard} onPress={async () => {
              try {
                await Share.share({ message: 'Check out my AnatomLabs fitness report!', title: 'My Report' });
              } catch {}
            }}>
              <View style={[styles.actionIcon, { backgroundColor: COLORS.warning + '20' }]}>
                <Ionicons name="share-social-outline" size={24} color={COLORS.warning} />
              </View>
              <Text style={styles.actionLabel}>Share</Text>
              <Text style={styles.actionDesc}>Share via apps</Text>
            </TouchableOpacity>
          </View>

          {shareToken && (
            <View style={styles.tokenContainer}>
              <Text style={styles.tokenLabel}>Share Token</Text>
              <Text style={styles.tokenValue}>{shareToken.slice(0, 16)}...</Text>
              <Text style={styles.tokenExpiry}>Expires in 72 hours</Text>
            </View>
          )}
        </GlassCard>
      )}

      <GlassCard>
        <View style={styles.coachReady}>
          <Ionicons name="people-outline" size={32} color={COLORS.primary} />
          <Text style={styles.coachTitle}>Coach-Ready Reports</Text>
          <Text style={styles.coachDesc}>
            Generated reports are designed to be shared with coaches. They include comprehensive data summaries, trend analysis, and AI insights.
          </Text>
        </View>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  description: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19, marginBottom: 16 },
  sectionGrid: { gap: 8 },
  sectionChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.cardBackgroundLight, borderWidth: 1, borderColor: COLORS.border },
  sectionChipText: { flex: 1, fontSize: 14, fontWeight: '500', color: COLORS.textSecondary },
  generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12, marginTop: 16 },
  generateBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard: { width: '47%', backgroundColor: COLORS.cardBackgroundLight, padding: 14, borderRadius: 12, gap: 6 },
  actionIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  actionDesc: { fontSize: 11, color: COLORS.textTertiary },
  tokenContainer: { marginTop: 16, padding: 12, backgroundColor: COLORS.cardBackgroundLight, borderRadius: 10 },
  tokenLabel: { fontSize: 11, color: COLORS.textTertiary },
  tokenValue: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginTop: 4, fontFamily: 'monospace' },
  tokenExpiry: { fontSize: 11, color: COLORS.warning, marginTop: 4 },
  coachReady: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  coachTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  coachDesc: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 19, paddingHorizontal: 10 },
});
