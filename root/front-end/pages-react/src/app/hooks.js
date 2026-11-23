/**
 * Shared Redux Hooks
 *
 * Provides pre-bound useDispatch and useSelector hooks for consistent
 * usage across all React components.
 */
import { useDispatch, useSelector } from 'react-redux';

export const useAppDispatch = () => useDispatch();
export const useAppSelector = useSelector;

export default { useAppDispatch, useAppSelector };
