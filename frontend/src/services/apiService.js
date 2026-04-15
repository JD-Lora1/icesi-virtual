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

export async function createCourse(payload) {
  const { data } = await apiClient.post('/courses', payload);
  return data;
}

export async function updateCourse(courseId, payload) {
  const { data } = await apiClient.patch(`/courses/${courseId}`, payload);
  return data;
}

export async function deleteCourse(courseId) {
  await apiClient.delete(`/courses/${courseId}`);
}

export async function createCompetency(payload) {
  const { data } = await apiClient.post('/competencies', payload);
  return data;
}

export async function updateCompetency(competencyId, payload) {
  const { data } = await apiClient.patch(`/competencies/${competencyId}`, payload);
  return data;
}

export async function deleteCompetency(competencyId) {
  await apiClient.delete(`/competencies/${competencyId}`);
}

export async function createObjective(payload) {
  const { data } = await apiClient.post('/learning-objectives', payload);
  return data;
}

export async function updateObjective(objectiveId, payload) {
  const { data } = await apiClient.patch(`/learning-objectives/${objectiveId}`, payload);
  return data;
}

export async function deleteObjective(objectiveId) {
  await apiClient.delete(`/learning-objectives/${objectiveId}`);
}
