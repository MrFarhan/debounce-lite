import React, { useState, useEffect } from 'react';
import debounce from '../utils';

const DummyComponent = () => {
  const [inputValue, setInputValue] = useState('');
  const [dummyData, setDummyData] = useState(null);

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
  };
  const fetchDummyData = async () => {
    try {
      const response = await fetch(
        `https://jsonplaceholder.typicode.com/posts?userId=${inputValue}`
      );
      const data = await response.json();
      setDummyData(data);
    } catch (error) {
      console.error('Error fetching dummy data:', error);
    }
  };

  useEffect(() => {
    debounce(() => fetchDummyData(), 700);
  }, [inputValue]);

  return (
    <div className="page-center">
      <div className="container">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          className="input-field"
          placeholder="Enter a user ID"
        />

        {dummyData && (
          <div className="card-container">
            {dummyData.map((item) => (
              <div key={item.id} className="card">
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DummyComponent;
