# IPC library using nlohmann/json

add_library(phoenix_ipc STATIC
    tcp_server.cpp
    client_session.cpp
    json_message.cpp
)

target_include_directories(phoenix_ipc PUBLIC 
    ${CMAKE_CURRENT_SOURCE_DIR}/../../include
    ${CMAKE_CURRENT_SOURCE_DIR}/../../third_party
)

target_link_libraries(phoenix_ipc PRIVATE 
    phoenix_engine
)

if(WIN32)
    target_link_libraries(phoenix_ipc PRIVATE ws2_32)
endif()

# Add include directory for generated headers
target_include_directories(phoenix_ipc INTERFACE
    $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/../../include>
)

# Create IPC server executable (optional)
option(BUILD_IPC_SERVER "Build IPC server executable" OFF)
if(BUILD_IPC_SERVER)
    add_executable(phoenix_ipc_server
        ipc_server_main.cpp
    )
    target_link_libraries(phoenix_ipc_server PRIVATE phoenix_ipc)
endif()

# Install targets
install(TARGETS phoenix_ipc
    LIBRARY DESTINATION lib
    ARCHIVE DESTINATION lib
    RUNTIME DESTINATION bin
)

if(BUILD_IPC_SERVER)
    install(TARGETS phoenix_ipc_server
        RUNTIME DESTINATION bin
    )
endif()
