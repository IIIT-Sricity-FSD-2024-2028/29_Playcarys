import { useCallback, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  fetchUsers,
  createUser,
  updateUser,
  updateUserStatus,
  assignUserRole,
  deleteUser
} from './userSlice';
import { selectUiUsers, selectUsersStatus, selectUsersError } from './selectors';
import { toUiUser, toCreateUserDto, toUpdateUserDto, roleIdFromName } from './userView';

/**
 * Users feature hook for the admin / superuser management pages.
 *
 * Every write is a real API call (the thunk is unwrapped, so a server rejection
 * throws to the caller and the page can show it). Nothing is applied locally when
 * the server refuses, which the old service functions did.
 */
export function useUsers() {
  const dispatch = useAppDispatch();
  const users = useAppSelector(selectUiUsers);
  const status = useAppSelector(selectUsersStatus);
  const error = useAppSelector(selectUsersError);

  const load = useCallback(() => dispatch(fetchUsers()).unwrap(), [dispatch]);

  const create = useCallback(
    async (form) => toUiUser(await dispatch(createUser(toCreateUserDto(form))).unwrap()),
    [dispatch]
  );

  const update = useCallback(
    async (id, form) =>
      toUiUser(await dispatch(updateUser({ id, data: toUpdateUserDto(form) })).unwrap()),
    [dispatch]
  );

  const setStatus = useCallback(
    async (id, nextStatus) =>
      toUiUser(await dispatch(updateUserStatus({ id, status: nextStatus })).unwrap()),
    [dispatch]
  );

  const setRole = useCallback(
    async (id, roleName) =>
      toUiUser(await dispatch(assignUserRole({ id, role_id: roleIdFromName(roleName) })).unwrap()),
    [dispatch]
  );

  const remove = useCallback((id) => dispatch(deleteUser(id)).unwrap(), [dispatch]);

  return useMemo(
    () => ({ users, status, error, load, create, update, setStatus, setRole, remove }),
    [users, status, error, load, create, update, setStatus, setRole, remove]
  );
}

export default useUsers;
