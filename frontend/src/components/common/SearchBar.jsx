import React from 'react';
import { TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

const SearchBar = ({ value, onChange, placeholder = 'Search...', width = 280 }) => (
  <TextField
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    size="small"
    sx={{ width }}
    InputProps={{
      startAdornment: (
        <InputAdornment position="start">
          <SearchIcon fontSize="small" sx={{ color: 'text.disabled' }} />
        </InputAdornment>
      ),
    }}
  />
);

export default SearchBar;
