import React from 'react';
import { useAuth } from '../AuthProvider';
import PublicSearch from './PublicSearch';
import UserSearch from './UserSearch';

const Search: React.FC = () => {
  const { user } = useAuth();

  if (user) {
    return <UserSearch />;
  }

  return <PublicSearch />;
};

export default Search;
