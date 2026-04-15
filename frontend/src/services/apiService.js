import apiClient from './apiClient.js';

export async function getHealth() {
  const { data } = await apiClient.get('/health');
  return data;
}

export async function getCourses() {
  const { data } = await apiClient.get('/courses');
  return data;
}

export async function getStats() {
  const { data } = await apiClient.get('/stats');
  return data;
}

export async function getCompetencies() {
  const { data } = await apiClient.get('/competencies');
  return data;
}

export async function getObjectives() {
  const { data } = await apiClient.get('/learning-objectives');
  return data;
}
