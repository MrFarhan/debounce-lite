import React, { useState, useEffect } from 'react';
import { TimeBasedDebounce, UserTypedDebounce } from '../utils';

const DummyComponent = () => {
  const [userTypedValue, setUserTyped] = useState('');
  const [timeBaseValue, setTimeBaseValue] = useState('');
  const [dummyData, setDummyData] = useState(null);

  const fetchDummyData = async (value) => {
    console.log('calling');
    if (!value?.trim()?.length) return;
    try {
      const response = await fetch(`https://jsonplaceholder.typicode.com/posts?userId=${value}`);
      const data = await response.json();
      setDummyData(data);
    } catch (error) {
      console.error('Error fetching dummy data:', error);
    }
  };

  useEffect(() => {
    if (userTypedValue) UserTypedDebounce(() => fetchDummyData(userTypedValue), 700);
  }, [userTypedValue]);

  useEffect(() => {
    if (timeBaseValue) TimeBasedDebounce(() => fetchDummyData(timeBaseValue), 3000);
  }, [timeBaseValue]);

  return (
    <div className="page-center">
      <div className="container">
        <label>
          User Typed debounce
          <br />
          <br />
          <input
            type="text"
            value={userTypedValue}
            onChange={(event) => setUserTyped(event.target.value)}
            className="input-field"
            placeholder="Enter a user ID"
          />
        </label>

        <label>
          Time based debounce
          <br />
          <br />
          <input
            type="text"
            value={timeBaseValue}
            onChange={(event) => setTimeBaseValue(event.target.value)}
            className="input-field"
            placeholder="Enter a user ID"
          />
        </label>

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
